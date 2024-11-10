import process from 'node:process'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import { loadConfig } from '~/common/config'
import { initMongo } from '~/common/db/mongo'
import { pinoOptionsForEnv } from '~/common/logging'

async function main() {
  const config = loadConfig()
  const fastify = Fastify({
    maxParamLength: 5000,
    logger: pinoOptionsForEnv(config.ENVIRONMENT),
  })

  const db = await initMongo(config.MONGO_URL, fastify.log)

  fastify.register(cors, {
    origin: config.CORS_ALLOWED_ORIGINS,
  })

  fastify.get('/ping', (_, res) => {
    res.status(200).send('pong')
  })

  fastify.get('/test-query', async () => {
    return await db.giftKinds
      .find()
      .map(({ _id, name }) => ({ id: _id.toString(), name }))
      .toArray()
  })

  let resolveServerStopped = (_?: any) => {}
  const stopPromise = new Promise((res) => {
    resolveServerStopped = res
  })
  const stopping = false
  const stop = () => {
    fastify.log.info('Received signal. Stopping...')
    if (!stopping) {
      fastify.close().then(() => {
        resolveServerStopped()
      })
    }
  }

  await fastify.listen({
    host: config.LISTEN_HOST,
    port: config.LISTEN_PORT,
  })

  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  try {
    await stopPromise
  }
  catch (err) {
    fastify.log.error(err)
  }
  finally {
    await db.client.close()
  }
}

main()
  .then(() => void process.exit(0))
  .catch(console.error)
