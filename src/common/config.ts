import process from 'node:process'
import { z } from 'zod'

const Config = z.object({
  ENVIRONMENT: z.enum(['dev', 'prod']),
  PORT: z.coerce.number().int().default(3000),
  CORS_ALLOWED_ORIGINS: z.preprocess(i => (i as string).split(','), z.array(z.string())).default([]),
  BOT_TOKEN: z.string().min(1),
  MONGO_URL: z.string().min(1),
  CRYPTO_PAY_TOKEN: z.string().min(1),
  CRYPTO_PAY_BASE_URL: z.string().min(1),
  MINI_APP_URL: z.string().min(1),
  MINI_APP_SHORT_NAME: z.string().min(1),
})

export type Config = z.infer<typeof Config>

export function loadConfig(): Config {
  return Config.parse(process.env)
}
