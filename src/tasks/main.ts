import type { Task, TaskContext, TaskResult } from './types'
import process from 'node:process'
import { sleep } from '@trpc/server/unstable-core-do-not-import'
import { Api } from 'grammy'
import pino from 'pino'
import { installTransformers } from '~/bot/transformers'
import { loadConfig } from '~/common/config'
import { CryptoPay } from '~/common/crypto-pay'
import { initMongo } from '~/common/db/mongo'
import { pinoOptionsForEnv } from '~/common/logging'
import { clamp, T } from '~/common/utils'
import tasks from './tasks'

type TaskName = keyof typeof tasks
type WrappedTask = Promise<
  | { ok: true, name: TaskName, result: TaskResult }
  | { ok: false, name: TaskName, error: unknown }
>

async function main() {
  const config = loadConfig()
  const logger = pino(pinoOptionsForEnv(config.ENVIRONMENT))

  const ctx: TaskContext = {
    config,
    db: await initMongo(config.MONGO_URL, logger),
    logger,
    tgApi: installTransformers(new Api(config.BOT_TOKEN)),
    cryptoPay: new CryptoPay(config.CRYPTO_PAY_BASE_URL, config.CRYPTO_PAY_TOKEN),
  }

  let running = true
  const stop = () => {
    logger.info('Received signal')
    running = false
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)

  const wrapTask = (name: TaskName, task: Task): WrappedTask => (
    new Promise((res) => {
      task(ctx)
        .then(result => void res({ ok: true, name, result }))
        .catch(error => void res({ ok: false, name, error }))
    })
  )

  const logTaskMessage = (name: TaskName, message: string) => void ctx.logger.info(`[${name}]: ${message}`)
  const logTaskError = (name: TaskName, error: unknown) => void ctx.logger.error(error, `[${name}] failed.`)
  const newStats = () => (
    Object.fromEntries(
      Object
        .keys(tasks)
        .map(name => [name, { successes: 0, failures: 0 }]),
    )
  ) as Record<TaskName, { successes: number, failures: number }>

  const lastErrorDelays: { [k in TaskName]?: number } = {}
  const timeouts: { [k in TaskName]?: NodeJS.Timeout } = {}
  const promises = Object.fromEntries(
    Object
      .entries(tasks)
      .map(([name, task]) => [name, wrapTask(name as TaskName, task)]),
  ) as Record<TaskName, WrappedTask>

  let statsLastPrinted = new Date()
  let stats = newStats()
  const printStatsIfNeeded = () => {
    const now = new Date()
    if (now.getTime() - statsLastPrinted.getTime() > 30 * T.Sec) {
      ctx.logger.info(`Statistics:${Object.entries(stats).map(([name, ts]) => `\n  [${name}]: ${ts.successes} OK, ${ts.failures} FAIL`)}`)
      stats = newStats()
      statsLastPrinted = now
    }
  }

  while (true) {
    const wrappedPromises = Object.values(promises)
    if (wrappedPromises.length > 0) {
      const payload = await Promise.race(Object.values(wrappedPromises))
      delete promises[payload.name]

      let delay
      if (payload.ok) {
        stats[payload.name].successes++
        if (payload.result.message)
          logTaskMessage(payload.name, payload.result.message)
        delay = payload.result.repeatAfter
        delete lastErrorDelays[payload.name]
      }
      else {
        stats[payload.name].failures++
        logTaskError(payload.name, payload.error)
        delay = getNextErrorDelay(lastErrorDelays[payload.name] ?? 0)
        lastErrorDelays[payload.name] = delay
      }

      if (running) {
        timeouts[payload.name] = setTimeout(() => {
          promises[payload.name] = wrapTask(payload.name, tasks[payload.name])
        }, delay)
      }
    }
    else {
      await sleep(50 * T.Ms)
    }

    printStatsIfNeeded()

    if (!running) {
      ctx.logger.info('Stopping...')
      Object.values(timeouts).forEach(t => clearTimeout(t))
      const payloads = await Promise.all(Object.values(promises))
      for (const payload of payloads) {
        if (payload.ok && payload.result.message)
          logTaskMessage(payload.name, payload.result.message)
        else if (!payload.ok)
          logTaskError(payload.name, payload.error)
      }
      break
    }
  }
}

function getNextErrorDelay(lastErrorDelay: number) {
  return clamp(lastErrorDelay * 2, T.Sec, T.Min)
}

main()
  .then(() => void process.exit(0))
  .catch(console.error)
