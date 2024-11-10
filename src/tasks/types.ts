import type { Api } from 'grammy'
import type { CryptoPay } from '~/common/crypto-pay'
import type { Database } from '~/common/db/mongo'
import type { Logger } from '~/common/logging'

export type TaskContext = {
  logger: Logger
  tgApi: Api
  db: Database
  cryptoPay: CryptoPay
}

export type TaskResult = {
  message: string | null
  repeatAfter: number
}

export type Task = (ctx: TaskContext) => Promise<TaskResult>