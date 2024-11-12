import { z } from 'zod'

export type Asset = z.infer<typeof Asset>
export const Asset = z.enum(['TON', 'USDT', 'ETH'])

export type Price = z.infer<typeof Price>
export const Price = z.object({
  asset: Asset,
  amount: z.string(),
})

export type GiftKindOut = z.infer<typeof GiftKindOut>
export const GiftKindOut = z.object({
  id: z.string(),
  name: z.string(),
  price: Price,
  limit: z.number().int(),
  inStock: z.number(),
})

export type SentGiftOut = z.infer<typeof SentGiftOut>
export const SentGiftOut = z.object({
  id: z.string(),
  kindId: z.string(),
  order: z.number(),
  purchasePrice: Price,
  sentAt: z.date(),
})

export type SendableGiftOut = z.infer<typeof SendableGiftOut>
export const SendableGiftOut = z.object({
  id: z.string(),
  kindId: z.string(),
  order: z.number(),
  purchaseDate: z.date(),
  purchasePrice: Price,
  sendToken: z.string(),
})

export type GiftStatus = z.infer<typeof GiftStatus>
export const GiftStatus = z.union([
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('purchased'), gift: SendableGiftOut }),
  z.object({ status: z.literal('sent'), gift: SentGiftOut }),
])

export type UserOut = z.infer<typeof UserOut>
export const UserOut = z.object({
  id: z.string(),
  name: z.string(),
  isPremium: z.boolean(),
  receivedGiftsCount: z.number(),
})
