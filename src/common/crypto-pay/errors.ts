export class NetworkError extends Error {
  constructor(public originalError: unknown) {
    super('Failed to fetch.')
  }
}

export class InvalidResponseError extends Error {
  constructor(public originalError: unknown) {
    super('Response contains invalid JSON.')
  }
}

export class RequestFailedError extends Error {
  constructor(public detail: unknown) {
    super('Request is invalid.')
  }
}
