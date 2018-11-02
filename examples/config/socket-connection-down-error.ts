export class SocketConnectionDownError extends Error {
  constructor() {
    super()
    Object.setPrototypeOf(this, SocketConnectionDownError.prototype)
  }
}
