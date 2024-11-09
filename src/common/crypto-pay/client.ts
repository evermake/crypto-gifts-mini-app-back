import type { CryptoCurrency, FiatCurrency, Invoice, InvoiceStatus, PaidButtonName } from './types'
import { InvalidResponseError, NetworkError, RequestFailedError } from './errors'

export class CryptoPay {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  getInvoices(options: {
    asset?: CryptoCurrency
    fiat?: FiatCurrency
    ids?: number[]
    status?: InvoiceStatus
    offset?: number
    count?: number
  }): Promise<{ items: Invoice[] }> {
    const { ids, ...rest } = options
    return this.request('getInvoices', { ...rest, invoice_ids: ids?.join(',') })
  }

  createInvoice(options: {
    currency_type?: 'crypto' | 'fiat'
    asset?: CryptoCurrency
    fiat?: FiatCurrency
    accepted_assets?: CryptoCurrency[]
    amount: string
    description?: string
    hidden_message?: string
    paid_btn_name?: PaidButtonName
    paid_btn_url?: string
    payload?: string
    allow_comments?: boolean
    allow_anonymous?: boolean
    expires_in?: number
  }): Promise<Invoice> {
    return this.request('createInvoice', options)
  }

  private async request<T>(
    method: string,
    payload?: unknown,
  ): Promise<T> {
    let response
    try {
      response = await fetch(new URL(method, this.baseUrl), {
        body: payload == null
          ? undefined
          : JSON.stringify(payload),
        headers: {
          'Crypto-Pay-API-Token': this.token,
          'Content-Type': 'application/json',
        },
      })
    }
    catch (err) {
      throw new NetworkError(err)
    }

    let data
    try {
      data = await response.json() as ({ ok: false, error: unknown } | { ok: true, result: T })
    }
    catch (err) {
      throw new InvalidResponseError(err)
    }

    if (!data.ok) {
      throw new RequestFailedError(data.error)
    }

    return data.result
  }
}
