import pino from "pino"

const options = { level: process.env.LOG_LEVEL || inferDefaultLogLevel() }
// @ts-ignore
const logger = pino(options)
export const log = logger

function inferDefaultLogLevel() {
  if (process.env.NODE_ENV === "test" && process.env.DEBUG_TEST == null) {
    return "silent"
  }

  if (process.env.NODE_ENV === "production") {
    return "info"
  }

  return "debug"
}
