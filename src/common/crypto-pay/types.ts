export type Invoice = {
  currency_type: 'fiat' | 'crypto'
  asset?: CryptoCurrency // If currency_type is 'crypto'.
  fiat?: FiatCurrency // If currency_type is 'fiat'.
  accepted_assets?: CryptoCurrency[]

  invoice_id: number
  hash: string
  amount: string
  created_at: string
  description?: string
  hidden_message?: string
  payload?: string

  status: InvoiceStatus

  bot_invoice_url: string
  mini_app_invoice_url: string
  web_app_invoice_url: string

  allow_comments?: boolean
  allow_anonymous?: boolean

  expiration_date?: string

  paid_at?: string
  paid_asset?: CryptoCurrency
  paid_amount?: string
  paid_fiat_rate?: string
  paid_usd_rate?: string
  paid_anonymously?: boolean
  comment?: string

  fee_asset?: CryptoCurrency
  fee_amount?: number

  paid_btn_name?: PaidButtonName
  paid_btn_url?: string
}

export type InvoiceStatus = 'active' | 'paid' | 'expired'

export type PaidButtonName =
  | 'viewItem'
  | 'openChannel'
  | 'openBot'
  | 'callback'

export type CryptoCurrency =
  | 'USDT'
  | 'TON'
  | 'BTC'
  | 'ETH'
  | 'LTC'
  | 'BNB'
  | 'TRX'
  | 'USDC'
  | 'JET'

export type FiatCurrency =
  | 'USD'
  | 'EUR'
  | 'RUB'
  | 'BYN'
  | 'UAH'
  | 'GBP'
  | 'CNY'
  | 'KZT'
  | 'UZS'
  | 'GEL'
  | 'TRY'
  | 'AMD'
  | 'THB'
  | 'INR'
  | 'BRL'
  | 'IDR'
  | 'AZN'
  | 'AED'
  | 'PLN'
  | 'ILS'
