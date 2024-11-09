import type { Long } from 'mongodb'

export function deleteUndefined(obj: any) {
  Object.keys(obj).forEach(key => obj[key] === undefined ? delete obj[key] : void 0)
  return obj
}

export function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(x, max))
}

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

export const T = {
  Ms: 1,
  Sec: 1000,
  Min: 60 * 1000,
  Hour: 60 * 60 * 1000,
  Day: 24 * 60 * 60 * 1000,
}

export function randstr(length: number, alphabet: string): string {
  let result = ''
  const n = alphabet.length
  for (let counter = 0; counter < length; counter++) {
    result += alphabet.charAt(Math.floor(Math.random() * n))
  }
  return result
}

export function num(x: number | Long): number {
  return typeof x === 'number' ? x : x.toNumber()
}
