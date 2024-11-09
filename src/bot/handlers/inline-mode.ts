import { Composer } from 'grammy'
import type { Ctx } from '~/bot/context'
import {
  INVALID_INLINE_QUERY_RESULT_CACHE_SECONDS,
  VALID_SEND_GIFT_INLINE_QUERY_RESULT_CACHE_SECONDS,
} from '~/common/constants'
import { getReceiveTokenForGift, parseSendToken } from '~/common/gift-tokens'
import { upsertTgUser } from '~/common/tg-user'
import { tgUserToInternal } from '../middlewares/auth'

export const composer = new Composer<Ctx>()

composer.on('inline_query', async (ctx) => {
  const sendToken = parseSendToken(ctx.inlineQuery.query.trim())

  const answerInvalid = () => (
    ctx.answerInlineQuery([], {
      cache_time: INVALID_INLINE_QUERY_RESULT_CACHE_SECONDS,
      is_personal: false,
    })
  )

  if (sendToken) {
    // Auth-middleware is skipped for inline queries.
    ctx.$user = await upsertTgUser(tgUserToInternal(ctx.from), ctx.$db, ctx.$logger)

    const gift = await ctx.$db.gifts.findOne({
      purchaserId: ctx.$user._id,
      sendToken,
    })

    if (!gift || gift.status !== 'purchased') {
      await answerInvalid()
      return
    }

    const [
      giftKind,
      receiveToken,
    ] = await Promise.all([
      ctx.$db.giftKinds.findOne({ _id: gift.kindId }),
      getReceiveTokenForGift(gift._id, ctx.$db),
    ])

    if (!giftKind) {
      ctx.$logger.warn(`Could not find gift kind with ID=${gift.kindId.toString()}.`)
      await answerInvalid()
      return
    }

    // TODO: Add thumbnail photo.
    await ctx.answerInlineQuery(
      [{
        type: 'article',
        id: 'SEND_GIFT',
        title: ctx.$t.messages.inline.sendGift.title,
        description: ctx.$t.messages.inline.sendGift.description(giftKind.name),
        input_message_content: { message_text: ctx.$t.messages.inline.sendGift.message },
        reply_markup: {
          inline_keyboard: [
            [{
              text: ctx.$t.buttons.receiveGift,
              url: `tg://resolve?domain=${ctx.me.username}&appname=${ctx.$config.MINI_APP_SHORT_NAME}&startapp=rt__${receiveToken._id.toString()}`,
            }],
          ],
        },
      }],
      {
        cache_time: VALID_SEND_GIFT_INLINE_QUERY_RESULT_CACHE_SECONDS,
        is_personal: true, // To make sure other users won't get such results.
      },
    )
  }
  else {
    await answerInvalid()
  }
})
