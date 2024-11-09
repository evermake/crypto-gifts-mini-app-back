import type { Task } from '../types'
import { Binary } from 'mongodb'
import { downloadAvatar } from '~/common/avatars'
import { num, sleep, T } from '~/common/utils'

const UPDATE_PERIOD = 1 * T.Hour
const BATCH_SIZE = 100
const API_REQUESTS_DELAY = 1 * T.Sec

const task: Task = async ({ db, tgApi, logger }) => {
  let lastCallAt: Date | null = null

  const outdatedAvatars = await db.userAvatars.find(
    {
      $or: [
        { updatedAt: { $lt: new Date(Date.now() - UPDATE_PERIOD) } },
        { updatedAt: { $exists: false } },
      ],
    },
    { limit: BATCH_SIZE },
  ).toArray()

  if (outdatedAvatars.length === 0) {
    return {
      message: null,
      repeatAfter: 1 * T.Sec,
    }
  }

  let successful = 0
  for (const avatar of outdatedAvatars) {
    const user = await db.users.findOne(
      { _id: avatar._id },
      { projection: { 'tg.id': 1 } },
    )

    let avatarData
    let ok = false
    if (!user) {
      logger.error(`Cannot find avatar\'s user (${avatar._id}).`)
    }
    else {
      try {
        lastCallAt = await waitApiDelay(lastCallAt)
        avatarData = await downloadAvatar({ tgId: num(user.tg.id), api: tgApi })
        ok = true
      }
      catch (err) {
        logger.error(err, `Failed to download avatar for user (${avatar._id}).`)
      }
    }

    await db.userAvatars.updateOne(
      { _id: avatar._id },
      {
        $set: {
          // TODO: Handle failed requests in another way.
          updatedAt: new Date(),
          avatar: avatarData == null ? avatarData : new Binary(avatarData),
        },
      },
    )

    if (ok)
      successful++
  }

  return {
    message: `Updated avatars for ${successful} users, ${outdatedAvatars.length - successful} failed.`,
    repeatAfter: 0,
  }
}

async function waitApiDelay(lastCallAt: Date | null) {
  if (lastCallAt) {
    const toWait = API_REQUESTS_DELAY - (Date.now() - lastCallAt.getTime())
    if (toWait > 0)
      await sleep(toWait)
  }
  return new Date()
}

export default task
