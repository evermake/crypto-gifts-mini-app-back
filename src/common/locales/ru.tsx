import type { Locale } from '.'
import { html } from '@telegum/tgx'

export default ((): Locale => ({
  bot: {
    bio: 'Покупай и дари подарки через Crypto Bot.',
    intro: '💎🎁🤩\n\nПокупай и дари подарки друзьям.',
    commands: {
      start: 'начать',
    },
  },
  buttons: {
    openApp: 'Открыть приложение',
    viewGift: 'Посмотреть подарок',
    openGifts: 'Открыть подарки',
    receiveGift: 'Получить подарок',
  },
  cryptoPay: {
    invoiceDescription: (giftName: string) => `Покупка подарка: ${giftName}`,
  },
  messages: {
    start: '🎁 Здесь ты можешь покупать и дарить подарки друзьям.',
    inline: {
      sendGift: {
        title: 'Отправить подарок',
        description: (giftName: string) => `Отправить ${giftName}.`,
        message: html(
          <>
            {'🎁 У меня есть '}
            <b>подарок</b>
            {' для тебя! Нажми на кнопку ниже, чтобы открыть его.'}
          </>,
        ),
      },
    },
  },
  notifications: {
    youPurchasedGift: (giftName: string) => html(
      <>
        {'✅ Куплен новый подарок: '}
        <b>{giftName}</b>
        .
      </>,
    ),
    youReceivedGift: ({ senderName, giftName }: {
      senderName: string
      giftName: string
    }) => html(
      <>
        {'⚡️ Получен подарок: '}
        <b>{giftName}</b>
        {'. Отправитель: '}
        <b>{senderName}</b>
        .
      </>,
    ),
    yourGiftReceived: ({ recipientName, giftName }: {
      recipientName: string
      giftName: string
    }) => html(
      <>
        {'👌 Подарок отправлен: '}
        <b>{giftName}</b>
        {'. Получатель: '}
        <b>{recipientName}</b>
        .
      </>,
    ),
  },
}))()
