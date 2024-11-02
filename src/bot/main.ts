import process from 'node:process'
import { run } from '@grammyjs/runner'
import { Bot } from 'grammy'
import { loadConfig } from '~/common/config'

async function main() {
  const config = loadConfig()
  const bot = new Bot(config.BOT_TOKEN)

  bot.command('start', async (ctx) => {
    await ctx.react('👍')
  })

  const runner = run(bot)

  const stopRunner = () => {
    if (runner.isRunning()) {
      runner.stop()
    }
  }

  process.once('SIGTERM', stopRunner)
  process.once('SIGINT', stopRunner)

  await runner.task()
}

main()
