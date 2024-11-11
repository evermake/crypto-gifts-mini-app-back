import type { Asset, Price } from './schemas'
import { TRPCError } from '@trpc/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { CRYPTO_PAY_INVOICE_EXPIRE_SECONDS, RECEIVE_GIFT_TOKEN_LIFETIME } from '~/common/constants'
import type { Invoice } from '~/common/crypto-pay'
import type { Gift, User } from '~/common/db/documents'
import { assertModifiedCount } from '~/common/db/utils'
import { generateSendToken } from '~/common/gift-tokens'
import type { Logger } from '~/common/logging'
import { localeForUserLanguageCode } from '~/common/tg-user'
import { num } from '~/common/utils'
import { GiftKindOut, SendableGiftOut, SentGiftOut, UserOut } from './schemas'
import { miniAppProcedure, publicProcedure, router } from './trpc'

export type AppRouter = typeof appRouter

export const appRouter = router({
  me:
    miniAppProcedure
      .output(UserOut)
      .query(async ({ ctx }) => {
        return userDocumentToUserOut(ctx.user)
      }),

  user:
    miniAppProcedure
      .input(z.object({ userId: z.string() }))
      .output(UserOut)
      .query(async ({ ctx, input }) => {
        const notFoundError = new TRPCError({ code: 'NOT_FOUND' })
        if (!ObjectId.isValid(input.userId))
          throw notFoundError

        const doc = await ctx.db.users.findOne({ _id: new ObjectId(input.userId) })
        if (!doc)
          throw notFoundError
        return userDocumentToUserOut(doc)
      }),

  giftKinds:
    miniAppProcedure
      .output(z.array(GiftKindOut))
      .query(async ({ ctx }) => {
        const giftKinds = await ctx.db.giftKinds.find().toArray()
        return giftKinds.map(kind => ({
          id: kind._id.toString(),
          name: kind.name,
          price: kind.price,
          limit: kind.limit,
          inStock: kind.limit - kind.purchasedCount, // Do not subtract number of reserved gifts intentionally.
        }))
      }),

  // TODO: Paginate.
  mySendableGifts:
    miniAppProcedure
      .output(z.array(SendableGiftOut))
      .query(async ({ ctx }) => {
        return await ctx.db.gifts
          .find({
            purchaserId: ctx.user._id,
            status: 'purchased',
          })
          .map(doc => giftDocumentToSendableGift(doc, ctx.logger))
          .toArray()
      }),

  gift:
    publicProcedure
      .input(z.object({ giftId: z.string() }))
      .output(SentGiftOut)
      .query(async () => {
        throw new TRPCError({ code: 'NOT_IMPLEMENTED' })
      }),

  requestPurchaseGift:
    miniAppProcedure
      .input(z.object({ kindId: z.string() }))
      .output(z.object({
        giftId: z.string(),
        purchaseLink: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const invalidIdError = new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid gift kind ID.' })
        if (!ObjectId.isValid(input.kindId))
          throw invalidIdError

        const kindId = new ObjectId(input.kindId)

        const gift = await ctx.db.client.withSession(async session => (
          await session.withTransaction(async () => {
            const giftKind = await ctx.db.giftKinds.findOne(
              { _id: kindId },
              { session },
            )

            if (!giftKind)
              throw invalidIdError

            if (!(giftKind.limit - giftKind.purchasedCount > 0))
              throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Gifts of this kind are sold out.' })

            if (!(giftKind.limit - giftKind.purchasedCount - giftKind.reservedCount > 0))
              throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Cannot reserve a gift for now. Try again later.' })

            const existingGift = await ctx.db.gifts.findOne(
              {
                kindId,
                purchaserId: ctx.user._id,
                status: 'reserved',
              },
              { session },
            )
            if (existingGift)
              return existingGift

            // TODO: Do not generate it inside transaction.
            const invoice = await ctx.cryptoPay.createInvoice({
              currency_type: 'crypto',
              asset: giftKind.price.asset,
              amount: giftKind.price.amount,
              expires_in: CRYPTO_PAY_INVOICE_EXPIRE_SECONDS,
              description: ctx.t.cryptoPay.invoiceDescription(giftKind.name),
              allow_anonymous: true,
              allow_comments: true,
              payload: JSON.stringify({ userId: ctx.user._id, kindId }),

              // TODO: Is it necessary and if yes then what are the values?
              // paid_btn_name: '???',
              // paid_btn_url: '???',
            })

            const insertResult = await ctx.db.gifts.insertOne(
              {
                _id: new ObjectId(),
                kindId,
                sendToken: generateSendToken(),
                status: 'reserved',
                invoice,
                purchaserId: ctx.user._id,
              },
              { session },
            )

            const updateResult = await ctx.db.giftKinds.updateOne(
              { _id: kindId },
              { $inc: { reservedCount: 1 } },
              { session },
            )
            assertModifiedCount(updateResult.modifiedCount, 1)

            const newGift = await ctx.db.gifts.findOne(
              { _id: insertResult.insertedId },
              { session },
            )

            if (!newGift)
              throw new Error('Could not find the created gift.')

            return newGift
          })
        ))

        return {
          giftId: gift._id.toString(),
          purchaseLink: gift.invoice.mini_app_invoice_url,
        }
      }),

  receiveGift:
    miniAppProcedure
      .input(z.object({ receiveToken: z.string() }))
      .output(SentGiftOut)
      .mutation(async ({ ctx, input }) => {
        const invalidTokenError = new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired token.' })

        if (!input.receiveToken)
          throw invalidTokenError

        let needToNotifyUsers = false
        const gift = await ctx.db.client.withSession(async session => (
          await session.withTransaction(async () => {
            const token = await ctx.db.giftReceiveTokens.findOne(
              { _id: input.receiveToken },
              { session },
            )

            const now = new Date()
            if (!token || token.issuedAt.getTime() < (now.getTime() - RECEIVE_GIFT_TOKEN_LIFETIME))
              throw invalidTokenError

            const tokenGift = await ctx.db.gifts.findOne(
              { _id: token.giftId },
              { session },
            )

            if (!tokenGift) {
              ctx.logger.warn(`Cannot find receive token's gift (${token.giftId}).`)
              throw invalidTokenError
            }

            switch (tokenGift.status) {
              case 'reserved':
                ctx.logger.warn(`Receive token's gift (${tokenGift._id}) has status "reserved".`)
                throw invalidTokenError
              case 'purchased': {
                const updatedGift = await ctx.db.gifts.findOneAndUpdate(
                  { _id: tokenGift._id },
                  {
                    $set: {
                      status: 'sent',
                      sentAt: now,
                      receiverId: ctx.user._id,
                    },
                  },
                  {
                    session,
                    returnDocument: 'after',
                  },
                )

                if (!updatedGift || updatedGift.status !== 'sent')
                  throw new Error('Sent gift was not updated.')

                const res = await ctx.db.users.updateOne(
                  { _id: updatedGift.receiverId },
                  { $inc: { receivedGiftsCount: 1 } },
                  { session },
                )
                assertModifiedCount(res.modifiedCount, 1)

                await ctx.db.giftActions.insertOne(
                  {
                    _id: new ObjectId(),
                    date: now,
                    type: 'sending',
                    giftId: updatedGift._id,
                    receiverId: updatedGift.receiverId,
                    senderId: updatedGift.purchaserId,
                  },
                  { session },
                )

                needToNotifyUsers = true
                return updatedGift
              }
              case 'sent':
                // Ok, attempt to receive again.
                if (tokenGift.receiverId.equals(ctx.user._id))
                  return tokenGift
                throw invalidTokenError
              default: throw new Error(`Unexpected token's gift status: "${tokenGift satisfies never}".`)
            }
          })
        ))

        // Try to safely and asynchronously notify users.
        if (needToNotifyUsers) {
          (async () => {
            const [
              sender,
              giftKind,
            ] = await Promise.all([
              ctx.db.users.findOne({ _id: gift.purchaserId }),
              ctx.db.giftKinds.findOne({ _id: gift.kindId }),
            ])

            if (!sender)
              throw new Error('Sender is not found.')

            if (!giftKind)
              throw new Error('Gift kind is not found')

            const senderLocale = localeForUserLanguageCode(sender.tg.languageCode)
            const [
              receiverNotificationResult,
              senderNotificationResult,
            ] = await Promise.allSettled([
              ctx.tgApi.sendMessage(
                num(ctx.user.tg.id),
                ctx.t.notifications.youReceivedGift({
                  giftName: giftKind.name,
                  senderName: sender.name,
                }),
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{
                        text: ctx.t.buttons.viewGift,
                        web_app: { url: `${ctx.config.MINI_APP_URL}/profile` },
                      }],
                    ],
                  },
                },
              ),
              ctx.tgApi.sendMessage(
                num(sender.tg.id),
                senderLocale
                  .notifications
                  .yourGiftReceived({
                    giftName: giftKind.name,
                    recipientName: ctx.user.name,
                  }),
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{
                        text: senderLocale.buttons.openApp,
                        web_app: { url: ctx.config.MINI_APP_URL },
                      }],
                    ],
                  },
                },
              ),
            ])

            if (receiverNotificationResult.status === 'rejected')
              throw receiverNotificationResult.reason
            if (senderNotificationResult.status === 'rejected')
              throw senderNotificationResult.reason
          })().catch(err => ctx.logger.error(err, `Failed to notify users about receiving a gift (${gift._id}).`))
        }

        return giftDocumentToSentGift(gift, ctx.logger)
      }),

  // TODO: Paginate.
  userGifts:
    miniAppProcedure
      .input(z.union([
        z.object({ my: z.literal(true) }),
        z.object({ my: z.literal(false).optional(), userId: z.string() }),
      ]))
      .output(z.array(SentGiftOut))
      .query(async ({ ctx, input }) => {
        const userId = input.my === true
          ? ctx.user._id
          : input.userId

        return await ctx.db
          .gifts
          .find(
            {
              status: 'sent',
              receiverId: userId,
            },
            {
              sort: [['sentAt', 'desc']],
            },
          )
          .map(doc => giftDocumentToSentGift(doc, ctx.logger))
          .toArray()
      }),

  // TODO
  myActions:
    miniAppProcedure
      .query(async () => {
        throw new TRPCError({ code: 'NOT_IMPLEMENTED' })
      }),
})

function userDocumentToUserOut(doc: User): UserOut {
  return {
    id: doc._id.toString(),
    name: doc.name,
    isPremium: doc.tg.hasPremium,
    receivedGiftsCount: doc.receivedGiftsCount,
  }
}

function priceFromInvoice(invoice: Invoice, logger: Logger): Price {
  if (invoice.paid_amount && invoice.paid_asset) {
    return {
      amount: invoice.paid_amount,
      asset: invoice.paid_asset as Asset,
    }
  }
  else {
    logger.warn(`Invoice (${invoice.invoice_id}) doesn't have paid_amount or paid_asset.`)
    return { asset: 'TON', amount: '0.0' }
  }
}

function giftDocumentToSentGift(doc: Gift, logger: Logger): SentGiftOut {
  if (doc.status !== 'sent')
    throw new Error(`Gift (${doc._id}) is not sent as it's status is "${doc.status}".`)

  return {
    id: doc._id.toString(),
    kindId: doc.kindId.toString(),
    order: doc.order,
    sentAt: doc.sentAt,
    purchasePrice: priceFromInvoice(doc.invoice, logger),
  }
}

function giftDocumentToSendableGift(doc: Gift, logger: Logger): SendableGiftOut {
  if (doc.status !== 'purchased')
    throw new Error(`Gift (${doc._id}) is not sendable as it's status is "${doc.status}".`)

  let purchaseDate
  if (doc.invoice.paid_at) {
    purchaseDate = new Date(doc.invoice.paid_at)
  }
  else {
    logger.warn(`Gift (${doc._id}) is reserved but doesn't have paid_at.`)
    purchaseDate = new Date(0)
  }

  return {
    id: doc._id.toString(),
    kindId: doc.kindId.toString(),
    order: doc.order,
    sendToken: doc.sendToken,
    purchaseDate,
    purchasePrice: priceFromInvoice(doc.invoice, logger),
  }
}
