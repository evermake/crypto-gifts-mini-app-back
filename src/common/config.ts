import process from 'node:process'
import { z } from 'zod'

const Config = z.object({
  PORT: z.coerce.number().int(),
  BOT_TOKEN: z.string().min(5),
})

export function loadConfig() {
  return Config.parse(process.env)
}
