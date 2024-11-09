import type { FastifyRequest } from 'fastify'
import { parse, validate } from '@telegram-apps/init-data-node'
import { TMA_INIT_DATA_EXPIRE_SECONDS } from '~/common/constants'

export function extractTmaInitData(req: FastifyRequest, token: string) {
  const tmaInitDataRaw = req.raw.headers['tma-init-data']
  if (typeof tmaInitDataRaw === 'string') {
    try {
      validate(
        tmaInitDataRaw,
        token,
        { expiresIn: TMA_INIT_DATA_EXPIRE_SECONDS },
      )
      return parse(tmaInitDataRaw)
    }
    catch (err) {
      req.log.warn('Invalid Mini App init data.', err)
    }
  }

  return undefined
}
