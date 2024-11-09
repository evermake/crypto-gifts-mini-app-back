export function assertModifiedCount(actual: number, expected: number) {
  if (actual !== expected)
    throw new Error(`Expected to have ${expected} document(s) to be modified, but there are ${actual}.`)
}

export function assertDeletedCount(actual: number, expected: number) {
  if (actual !== expected)
    throw new Error(`Expected to have ${expected} document(s) to be deleted, but there are ${actual}.`)
}
