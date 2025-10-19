// Lightweight logger that respects NODE_ENV and LOG_LEVEL and persists errors to MongoDB.
// Usage: const logger = require('../utils/logger'); logger.debug(...); logger.info(...); logger.error(...);

const LEVELS = { debug: 10, info: 20, error: 30 };
const envLevel = (
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "error" : "debug")
).toLowerCase();
const currentLevel = LEVELS[envLevel] || LEVELS.debug;

function shouldLog(level) {
  return LEVELS[level] >= currentLevel;
}

// Try to lazy-require the Log model only when needed so this module is safe to import early.
let LogModel = null;
function getLogModel() {
  if (LogModel) return LogModel;
  try {
    // require lazily to avoid startup ordering issues
    // eslint-disable-next-line global-require
    LogModel = require("../models/logModel");
  } catch (e) {
    // model might not be available during some scripts; keep LogModel null
    LogModel = null;
  }
  return LogModel;
}

function persistLog(level, message, meta) {
  try {
    const Model = getLogModel();
    if (!Model) return;
    // write asynchronously, return the Promise so callers may await if they want
    return Model.create({ level, message, meta }).catch(() => {
      // swallow errors from logging to avoid cascading failures
      return null;
    });
  } catch (e) {
    // Ignore
    return null;
  }
}

function isReportableError(args) {
  // Only persist when we have an Error instance and it appears to be an unexpected/server error.
  // Skip persistence for common client-caused errors like validation, duplicate-key, or explicit 4xx statuses.
  if (!Array.isArray(args) || args.length === 0) return false;
  const err = args.find((a) => a instanceof Error);
  if (!err) return false;

  // Allow an override to force persisting logs (useful for debugging)
  if (process.env.FORCE_PERSIST_LOGS === "true") return true;

  const name = err.name || "";
  const code = err.code;
  const status = err.status || err.statusCode || err.httpStatus;

  // Ignore mongoose validation and common client errors
  if (name === "ValidationError") return false;
  if (name === "CastError") return false;
  if (code === 11000) return false; // duplicate key / unique index errors
  if (status && Number(status) < 500) return false; // client errors (4xx)

  // Otherwise treat as reportable
  return true;
}

module.exports = {
  debug: (...args) => {
    try {
      if (process.env.LOG_TO_STDERR === "true" && shouldLog("debug"))
        console.debug("[DEBUG]", ...args);
      // persist debug-level logs to DB (non-blocking)
      try {
        const message = args
          .map((a) => {
            if (a instanceof Error) return a.message;
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch (e) {
              return String(a);
            }
          })
          .join(" ");
        const meta = { args: args.map((a) => (a instanceof Error ? { message: a.message, stack: a.stack } : a)) };
        persistLog("debug", message, meta);
      } catch (e) {
        /* swallow */
      }
    } catch (e) {
      /* swallow logging errors */
    }
  },
  info: (...args) => {
    try {
      if (process.env.LOG_TO_STDERR === "true" && shouldLog("info"))
        console.log("[INFO]", ...args);
      // persist info-level logs to DB (non-blocking)
      try {
        const message = args
          .map((a) => {
            if (a instanceof Error) return a.message;
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch (e) {
              return String(a);
            }
          })
          .join(" ");
        const meta = { args: args.map((a) => (a instanceof Error ? { message: a.message, stack: a.stack } : a)) };
        persistLog("info", message, meta);
      } catch (e) {
        /* swallow */
      }
    } catch (e) {
      /* swallow logging errors */
    }
  },
  error: (...args) => {
    try {
      // Only write to stderr when explicitly requested (LOG_TO_STDERR=true)
      if (process.env.LOG_TO_STDERR === "true") {
        console.error("[ERROR]", ...args);
      }
    } catch (e) {
      // ignore
    }
    // Persist a structured error record to the database only for reportable/unknown errors.
    try {
      const message = args
        .map((a) => {
          if (a instanceof Error) return a.message;
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch (e) {
            return String(a);
          }
        })
        .join(" ");
      const meta = {
        args: args.map((a) => {
          if (a instanceof Error) {
            return { message: a.message, stack: a.stack };
          }
          return a;
        }),
      };
      // persist error-level logs to DB (non-blocking)
      persistLog("error", message, meta);
    } catch (e) {
      // swallow
    }
  },
};

// Export a helper that other modules can call directly to populate the logs table.
// This function accepts (level, message, meta) and will persist only when level === 'error'
// unless FORCE_PERSIST_LOGS is set.
module.exports.populateErrorTable = async function populateErrorTable(
  level,
  message,
  meta
) {
  try {
    if (
      String(level).toLowerCase() !== "error" &&
      process.env.FORCE_PERSIST_LOGS !== "true"
    ) {
      // By default we only persist errors. Caller can set FORCE_PERSIST_LOGS to override.
      return null;
    }
    const Model = getLogModel();
    if (!Model) return null;
    // Await the creation so callers who want to know when the write completes can await.
    // Callers that don't await will still get a background Promise and the write will occur.
    const doc = await Model.create({
      level: String(level).toLowerCase(),
      message: String(message),
      meta,
    });
    return doc;
  } catch (e) {
    // swallow errors from logging to avoid cascading failures
    return null;
  }
};
