import type { NextFunction } from 'grammy'
import type { Ctx } from '../context'
import { en, ru } from '~/common/locales'

export default (ctx: Ctx, next: NextFunction) => {
  if (ctx.from?.language_code === 'ru') {
    ctx.$t = ru
  }
  else {
    ctx.$t = en
  }

  return next()
}
