import type { Task, TaskContext } from '../types'
import { ObjectId } from 'mongodb'
import type { Asset } from '~/api/schemas'
import type { Invoice } from '~/common/crypto-pay'
import type { Gift, GiftKind } from '~/common/db/documents'
import { assertDeletedCount } from '~/common/db/utils'
import { localeForUserLanguageCode } from '~/common/tg-user'
import { num, T } from '~/common/utils'

const DB_BATCH_SIZE = 100
const CRYPTO_PAY_BATCH_SIZE = 10

const task: Task = async (ctx) => {
  const { db, cryptoPay, logger } = ctx

  const reservedGifts = await db.gifts
    .find(
      { status: 'reserved' },
      {
        limit: DB_BATCH_SIZE,
        projection: {
          '_id': 1,
          'invoice.invoice_id': 1,
        },
      },
    )
    .toArray()

  const N = reservedGifts.length
  if (N === 0) {
    return {
      message: null,
      repeatAfter: T.Sec,
    }
  }

  const stats = { pending: 0, paid: 0, expired: 0, error: 0 }
  while (reservedGifts.length !== 0) {
    const batch = reservedGifts.splice(0, CRYPTO_PAY_BATCH_SIZE)

    const { items: invoices } = await cryptoPay.getInvoices({
      ids: batch.map(({ invoice }) => invoice.invoice_id),
    })

    const pairs: [Gift, Invoice][] = []
    for (const gift of batch) {
      const invoice = invoices.find(({ invoice_id }) => invoice_id === gift.invoice.invoice_id)
      if (!invoice) {
        logger.error(`Invoice for the gift was not returned (gift_id=${gift._id}, invoice_id=${gift.invoice.invoice_id}).`)
        stats.error++
        continue
      }
      pairs.push([gift, invoice])
    }

    for (const [gift, invoice] of pairs) {
      try {
        const state = await processReservedGift(gift._id, invoice, ctx)
        stats[state]++
      }
      catch (err) {
        logger.error(err, `Failed to update a reserved gift (${gift._id}).`)
        stats.error++
      }
    }
  }

  return {
    message: `Updated ${N} gifts (${Object.entries(stats).map(([x, n]) => `${x}:${n}`).join(',')}).`,
    repeatAfter: T.Sec,
  }
}

async function processReservedGift(
  id: ObjectId,
  invoice: Invoice,
  { db, tgApi, logger }: TaskContext,
): Promise<'pending' | 'paid' | 'expired'> {
  let purchaserIdToNotify = null as ObjectId | null
  let purchasedGiftKind = null as GiftKind | null

  const result = await db.client.withSession(async session => (
    await session.withTransaction(async () => {
      const gift = await db.gifts.findOne(
        { _id: id },
        { session },
      )

      if (!gift)
        throw new Error(`Gift (${id}) is not found.`)
      if (gift.status !== 'reserved')
        throw new Error(`Expected the gift (${id}) to have a status "reserved", but it has "${gift.status}".`)
      if (gift.invoice.invoice_id !== invoice.invoice_id)
        throw new Error(`Gift (${id}) has a linked invoice with ID ${gift.invoice.invoice_id}, not ${invoice.invoice_id}.`)

      let res
      switch (invoice.status) {
        case 'active': {
          res = await db.gifts.updateOne(
            { _id: gift._id },
            { $set: { invoice } },
            { session },
          )

          return 'pending'
        }
        case 'paid': {
          const updatedKind = await db.giftKinds.findOneAndUpdate(
            { _id: gift.kindId },
            {
              $inc: {
                reservedCount: -1,
                purchasedCount: 1,
              },
            },
            {
              session,
              returnDocument: 'after',
            },
          )

          if (!updatedKind)
            throw new Error(`Gift kind was not updated or returned.`)

          res = await db.gifts.updateOne(
            { _id: gift._id },
            {
              $set: {
                status: 'purchased',
                invoice,
                order: updatedKind.purchasedCount,
              },
            },
            { session },
          )

          await db.giftActions.insertOne(
            {
              _id: new ObjectId(),
              type: 'purchase',
              giftId: gift._id,
              date: invoice.paid_at ? new Date(invoice.paid_at) : new Date(),
              purchaserId: gift.purchaserId,
              price: {
                asset: invoice.asset as Asset,
                amount: invoice.amount,
              },
            },
            { session },
          )

          purchaserIdToNotify = gift.purchaserId
          purchasedGiftKind = updatedKind

          return 'paid'
        }
        case 'expired': {
          res = await db.gifts.deleteOne(
            { _id: gift._id },
            { session },
          )
          assertDeletedCount(res.deletedCount, 1)

          res = await db.giftKinds.updateOne(
            { _id: gift.kindId },
            {
              $inc: {
                reservedCount: -1,
              },
            },
            { session },
          )

          return 'expired'
        }
        default:
          throw new Error(`Unknown invoice status: "${invoice.status satisfies never}".`)
      }
    })
  ))

  if (purchaserIdToNotify && purchasedGiftKind) {
    (async () => {
      const user = await db.users.findOne({ _id: purchaserIdToNotify })
      if (!user)
        throw new Error('User is not found.')

      await tgApi.sendMessage(
        num(user.tg.id),
        localeForUserLanguageCode(user.tg.languageCode)
          .notifications
          .youPurchasedGift(purchasedGiftKind.name),
      )
    })().catch(err => logger.error(err, `Failed to notify purchaser (${purchaserIdToNotify}) about the purchased gift (${id}).`))
  }

  return result
}

export default task
