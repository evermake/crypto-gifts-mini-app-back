import type { Api } from 'grammy'
import { Buffer } from 'node:buffer'

const TARGET_DIMENSIONS = [300, 300]

/**
 * Downloads Telegram profile photo for a user.
 *
 * Returns null, if the user doesn't have profile photo or it is not an image.
 */
export async function downloadAvatar({ tgId, api }: {
  tgId: number
  api: Api
}) {
  const { photos } = await api.getUserProfilePhotos(tgId, { limit: 100 })

  if (photos.length === 0)
    return null

  const { file_id } = photos[0]
    .map(ph => ({ ...ph, diff: Math.abs(ph.width - TARGET_DIMENSIONS[0]) + Math.abs(ph.height - TARGET_DIMENSIONS[1]) }))
    .sort((a, b) => a.diff - b.diff)
    .at(0)!

  const { file_path } = await api.getFile(file_id)

  if (file_path == null)
    throw new Error('Failed to download file: file_path is nullish.')

  if (!(/\.jpe?g$/i).test(file_path))
    return null

  const res = await fetch(`https://api.telegram.org/file/bot${api.token}/${file_path}`)
  if (!res.ok)
    throw new Error(`Failed to download file: status is ${res.status}.`)
  if (!res.body)
    throw new Error(`Failed to download file: empty body.`)

  return Buffer.from(await res.arrayBuffer())
}
