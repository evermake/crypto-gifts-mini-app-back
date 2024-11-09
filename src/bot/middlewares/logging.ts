import type { NextFunction } from 'grammy'
import type { Ctx } from '../context'

export default async (ctx: Ctx, next: NextFunction) => {
  const updateId = ctx.update.update_id
  ctx.$logger.info(ctx.update, 'Incoming update.')

  const startMs = performance.now()
  let error
  try {
    await next()
  }
  catch (err) {
    error = err
  }
  const duration = performance.now() - startMs
  ctx.$logger.info({ updateId, duration }, 'Update processed.')

  if (error)
    throw error
}
