import type { Ctx } from '../context'
import { Composer } from 'grammy'

export const composer = new Composer<Ctx>()

composer.command('start', async (ctx) => {
  // TODO: Reply with photo.
  await ctx.reply(
    ctx.$t.messages.start,
    {
      reply_markup: {
        inline_keyboard: [
          [{
            text: ctx.$t.buttons.openApp,
            web_app: { url: ctx.$config.MINI_APP_URL },
          }],
        ],
      },
    },
  )
})
