// Entry-point for web-server with API.
import Fastify from 'fastify'
import { loadConfig } from '~/config'



async function main() {
  const config = loadConfig()

  const fastify = Fastify({
    logger: true
  })

  fastify.get('/', async function handler (request, reply) {
    return { hello: 'world' }
  })
  
  try {
    await fastify.listen({ port: config.PORT })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main()
