import { html } from '@telegum/tgx'

export default {
  bot: {
    bio: 'Buy and send gifts to your friends with @CryptoBot.',
    intro: '💎🎁🤩\n\nBuy and send gifts to your friends.',
    commands: {
      start: 'start gifting',
    },
  },
  buttons: {
    openApp: 'Open App',
    viewGift: 'View Gift',
    openGifts: 'Open Gifts',
    receiveGift: 'Receive Gift',
  },
  cryptoPay: {
    invoiceDescription: (giftName: string) => `Purchasing a ${giftName} gift`,
  },
  messages: {
    start: '🎁 Here you can buy and send gifts to your friends.',

    inline: {
      sendGift: {
        title: 'Send Gift',
        description: (giftName: string) => `Send a gift of ${giftName}.`,
        message: html(
          <>
            {'🎁 I have a '}
            <b>gift</b>
            {' for you! Tap the button below to open it.'}
          </>,
        ),
      },
    },
  },
  notifications: {
    youPurchasedGift: (giftName: string) => html(
      <>
        {'✅ You have purchased the gift of '}
        <b>{giftName}</b>
        .
      </>,
    ),
    youReceivedGift: ({ senderName, giftName }: {
      senderName: string
      giftName: string
    }) => html(
      <>
        {'⚡️ '}
        <b>{senderName}</b>
        {' has given you the gift of '}
        <b>{giftName}</b>
        .
      </>,
    ),
    yourGiftReceived: ({ recipientName, giftName }: {
      recipientName: string
      giftName: string
    }) => html(
      <>
        {'👌 '}
        <b>{recipientName}</b>
        {' received your gift of '}
        <b>{giftName}</b>
        .
      </>,
    ),
  },
}
