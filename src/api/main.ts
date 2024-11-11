import type { FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify'
import type { Buffer } from 'node:buffer'
import type { AppRouter } from './router'
import process from 'node:process'
import cors from '@fastify/cors'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import Fastify from 'fastify'
import { Api } from 'grammy'
import { Binary, ObjectId } from 'mongodb'
import { installTransformers } from '~/bot/transformers'
import { downloadAvatar } from '~/common/avatars'
import { loadConfig } from '~/common/config'
import { CryptoPay } from '~/common/crypto-pay'
import { initMongo } from '~/common/db/mongo'
import { pinoOptionsForEnv } from '~/common/logging'
import { num } from '~/common/utils'
import { contextBuilder } from './context'
import { appRouter } from './router'

async function main() {
  const config = loadConfig()
  const fastify = Fastify({
    maxParamLength: 5000,
    logger: pinoOptionsForEnv(config.ENVIRONMENT),
  })
  const db = await initMongo(config.MONGO_URL, fastify.log)
  const tgApi = installTransformers(new Api(config.BOT_TOKEN))
  const cryptoPay = new CryptoPay(config.CRYPTO_PAY_BASE_URL, config.CRYPTO_PAY_TOKEN)

  fastify.register(cors, {
    origin: config.CORS_ALLOWED_ORIGINS,
  })

  fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: contextBuilder({ db, config, cryptoPay, tgApi }),
      onError: ({ path, error, input }) => {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          fastify.log.error(error, `[${path}] Internal error in tRPC handler.`, { input })
        }
        else {
          fastify.log.warn(error, `[${path}] Error in tRPC handler.`)
        }
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  })

  fastify.get('/ping', (_, res) => {
    res.status(200).send('pong')
  })

  // TODO: Move it to a better place.
  fastify.get('/avatars/:userId', async (req, res) => {
    const rawUserId = (req.params as { userId?: string }).userId

    const sendNoAvatar = () => {
      res
        .header('cache-control', 'public, max-age=100')
        .type('plain/text')
        .status(404)
        .send('not found')
    }
    const sendAvatar = (data: Buffer | Uint8Array) => {
      res
        .header('cache-control', 'public, max-age=100')
        .type('image/jpeg')
        .status(200)
        .send(data)
    }

    if (!rawUserId || !ObjectId.isValid(rawUserId)) {
      sendNoAvatar()
      return
    }

    const userId = new ObjectId(rawUserId)

    const avatar = await db.userAvatars.findOne({ _id: userId })
    if (avatar == null || avatar.updatedAt == null) {
      const user = await db.users.findOne(
        { _id: userId },
        { projection: { '_id': 1, 'tg.id': 1 } },
      )

      if (!user) {
        sendNoAvatar()
        return
      }

      req.log.info('downloading...')
      const freshAvatarData = await downloadAvatar({ tgId: num(user.tg.id), api: tgApi })
      req.log.info('downloaded')
      if (freshAvatarData == null) {
        req.log.info('sending no avatar')
        sendNoAvatar()
      }
      else {
        req.log.info('sending avatar...')
        sendAvatar(freshAvatarData)
      }

      await db.userAvatars.updateOne(
        { _id: user._id },
        {
          $set: {
            _id: user._id,
            updatedAt: new Date(),
            avatar: freshAvatarData === null ? null : new Binary(freshAvatarData),
          },
        },
        { upsert: true },
      )
    }
    else if (avatar.avatar == null) {
      sendNoAvatar()
    }
    else {
      sendAvatar(avatar.avatar.buffer)
    }
  })

  // Graceful shutdown.
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
