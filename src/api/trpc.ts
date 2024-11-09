import type { Context } from './context'
import { initTRPC, TRPCError } from '@trpc/server'
import { localeForUserLanguageCode, upsertTgUser } from '~/common/tg-user'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const miniAppProcedure = t.procedure.use(async ({ ctx, next }) => {
  const tgUser = ctx.tmaInitData?.user
  if (!tgUser)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Empty or invalid Mini App init data.' })

  const user = await upsertTgUser(
    {
      id: tgUser.id,
      isPremium: tgUser.isPremium,
      languageCode: tgUser.languageCode,
      username: tgUser.username,
      firstName: tgUser.firstName,
      lastName: tgUser.lastName,
    },
    ctx.db,
    ctx.logger,
  )

  ctx.t = localeForUserLanguageCode(user.tg.languageCode)

  return next({
    ctx: { ...ctx, user },
  })
})
