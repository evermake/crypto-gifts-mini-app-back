import { MongoClient } from 'mongodb'
import type {
  Gift,
  GiftAction,
  GiftKind,
  GiftReceiveToken,
  User,
  UserAvatar,
} from '~/common/db/documents'
import type { Logger } from '~/common/logging'

export type Database = Awaited<ReturnType<typeof initMongo>>

export async function initMongo(url: string, logger: Logger) {
  const client = new MongoClient(url)

  logger.info('Connecting to Mongo...')
  await client.connect()
  logger.info('Connected.')

  const db = client.db()
  const users = db.collection<User>('users')
  const userAvatars = db.collection<UserAvatar>('users.avatars')
  const gifts = db.collection<Gift>('gifts')
  const giftKinds = db.collection<GiftKind>('gifts.kinds')
  const giftActions = db.collection<GiftAction>('gifts.actions')
  const giftReceiveTokens = db.collection<GiftReceiveToken>('gifts.receivetokens')

  // Create indexes.
  await users.createIndex(
    { 'tg.id': 1 },
    {
      name: 'unique_tg_id',
      unique: true,
    },
  )

  return {
    client,
    users,
    userAvatars,
    gifts,
    giftKinds,
    giftActions,
    giftReceiveTokens,
  }
}
