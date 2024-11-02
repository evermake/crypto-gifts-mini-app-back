import process from 'node:process'
import Fastify from 'fastify'
import { loadConfig } from '~/common/config'

async function main() {
  const config = loadConfig()

  const fastify = Fastify({
    logger: true,
  })

  fastify.get('/', async (_req, _res) => {
    return { hello: 'world' }
  })

  try {
    await fastify.listen({ port: config.PORT })
  }
  catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main()
