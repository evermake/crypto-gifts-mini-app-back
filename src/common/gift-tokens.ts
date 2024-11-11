import type { ObjectId } from 'mongodb'
import type { GiftReceiveToken } from './db/documents'
import crypto from 'node:crypto'
import type { Database } from '~/common/db/mongo'
import { randstr } from './utils'

export function parseSendToken(s: string): string | null {
  const match = (/^(=[A-Z0-9]{10})$/i).exec(s)
  if (match)
    return match[1]
  return null
}

export function generateSendToken(): string {
  return `=${randstr(10, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')}`
}

function generateReceiveToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

export async function getReceiveTokenForGift(
  giftId: ObjectId,
  db: Database,
): Promise<GiftReceiveToken> {
  return await db.giftReceiveTokens.findOneAndUpdate(
    { giftId },
    {
      $set: {
        giftId,
        issuedAt: new Date(),
      },
      $setOnInsert: {
        _id: generateReceiveToken(),
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  ) as GiftReceiveToken
}
