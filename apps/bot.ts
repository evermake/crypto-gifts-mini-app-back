// Entry-point for grammY Telegram Bot.

import { run } from "@grammyjs/runner";
import { Bot } from "grammy";
import { loadConfig } from "~/config";


async function main() {
  const config = loadConfig()
  const bot = new Bot(config.BOT_TOKEN)

  bot.command('start', async (ctx) => {
    await ctx.react("👍")
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
