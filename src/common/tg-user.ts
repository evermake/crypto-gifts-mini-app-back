import type { User } from './db/documents'
import type { Database } from './db/mongo'
import type { Locale } from './locales'
import type { Logger } from './logging'
import { Long } from 'mongodb'
import { en, ru } from './locales'

export type TelegramUser = {
  id: number
  languageCode: string | undefined
  isPremium: boolean | undefined
  username: string | undefined
  firstName: string
  lastName: string | undefined
}

export async function upsertTgUser(
  tgUser: TelegramUser,
  db: Database,
  logger: Logger,
): Promise<User> {
  const now = new Date()
  const user = await db.users.findOneAndUpdate(
    { 'tg.id': tgUser.id },
    {
      $set: {
        name: nameForTgUser(tgUser),
        tg: buildTgInfo(tgUser),
      },
      $setOnInsert: {
        createdAt: now,
        receivedGiftsCount: 0,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  ) as User

  if (user.createdAt.getTime() === now.getTime()) {
    try {
      await db.userAvatars.updateOne(
        { _id: user._id },
        {
          $set: { _id: user._id },
          $setOnInsert: {
            avatar: null,
          },
        },
        { upsert: true },
      )
    }
    catch (err) {
      logger.error(err, `Failed to create avatar document for a new user (${user._id}).`)
    }
  }

  return user
}

export function localeForUserLanguageCode(langCode: string | undefined | null): Locale {
  switch (langCode) {
    case 'ru': return ru
    default: return en
  }
}

function nameForTgUser(tgUser: TelegramUser): string {
  const first = tgUser.firstName.trim()
  const last = tgUser.lastName?.trim()
  const parts = [first]
  if (last)
    parts.push(last)
  return parts.join(' ')
}

function buildTgInfo(tgUser: TelegramUser): User['tg'] {
  return {
    id: Long.fromNumber(tgUser.id),
    hasPremium: tgUser.isPremium ?? false,
    languageCode: tgUser.languageCode,
    username: tgUser.username,
    firstName: tgUser.firstName,
    lastName: tgUser.lastName,
  }
}
