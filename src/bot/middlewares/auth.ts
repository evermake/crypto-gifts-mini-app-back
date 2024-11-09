import type { NextFunction } from 'grammy'
import type { User } from 'grammy/types'
import type { Ctx } from '../context'
import type { TelegramUser } from '~/common/tg-user'
import { upsertTgUser } from '~/common/tg-user'

export default async (ctx: Ctx, next: NextFunction) => {
  if (
    ctx.from
    && !ctx.update.inline_query // Skip inline queries not to load the DB.
  ) {
    try {
      ctx.$user = await upsertTgUser(
        tgUserToInternal(ctx.from),
        ctx.$db,
        ctx.$logger,
      )
    }
    catch (err) {
      ctx.$logger.error(err, 'Failed to upset user.')
    }
  }

  return next()
}

export function tgUserToInternal(from: User): TelegramUser {
  return {
    id: from.id,
    isPremium: from.is_premium,
    languageCode: from.language_code,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
  }
}
