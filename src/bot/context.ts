import type { Context } from 'grammy'
import type { Config } from '~/common/config'
import type { User } from '~/common/db/documents'
import type { Database } from '~/common/db/mongo'
import type { Locale } from '~/common/locales'
import type { Logger } from '~/common/logging'

export type Ctx =
  & Context
  & {
    $t: Locale
    $config: Config
    $logger: Logger
    $db: Database
    $user?: User
  }
