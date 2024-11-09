import type { Binary, Long, ObjectId } from 'mongodb'
import type { Price } from '~/api/schemas'
import type { Invoice } from '~/common/crypto-pay'

export type User = {
  _id: ObjectId
  name: string
  createdAt: Date
  receivedGiftsCount: number
  tg: {
    id: Long
    hasPremium: boolean
    languageCode?: string
    username?: string
    firstName: string
    lastName?: string
  }
}

export type UserAvatar = {
  /** Matches the user's _id. */
  _id: ObjectId
  /** Undefined if wasn't updated yet. */
  updatedAt?: Date
  avatar: Binary | null
}

export type Gift = {
  _id: ObjectId
  kindId: ObjectId
  purchaserId: ObjectId
  /**
   * Short string used by the purchaser to send this gift.
   * Unique across other gifts purchased by the same user.
   */
  sendToken: string
  invoice: Invoice
} & (
  | {
    status: 'reserved'
  } | {
    status: 'purchased'
    order: number
  } | {
    status: 'sent'
    order: number
    sentAt: Date
    receiverId: ObjectId
  }
)

export type GiftKind = {
  _id: ObjectId
  name: string
  price: Price
  limit: number
  purchasedCount: number
  reservedCount: number
}

export type GiftAction = {
  _id: ObjectId
  giftId: ObjectId
  date: Date
} & (
  | {
    type: 'purchase'
    purchaserId: ObjectId
    price: Price
  } | {
    type: 'sending'
    senderId: ObjectId
    receiverId: ObjectId
  }
)

export type GiftReceiveToken = {
  _id: string
  giftId: ObjectId
  issuedAt: Date
}
