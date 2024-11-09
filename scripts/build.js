import path from 'node:path'
import * as esbuild from 'esbuild'
import esbuildPluginPino from 'esbuild-plugin-pino'
import { rimraf } from 'rimraf'

const to = p => path.join(import.meta.dirname, p)

await rimraf(to('../dist'))
await esbuild.build({
  entryPoints: [
    to('../src/tasks/main.ts'),
    to('../src/api/main.ts'),
    to('../src/bot/main.ts'),
  ],
  outdir: 'dist',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outExtension: { '.js': '.cjs' },
  sourcemap: true,
  tsconfig: to('../tsconfig.json'),
  plugins: [
    esbuildPluginPino({ transports: ['pino-pretty'] }),
  ],
})
