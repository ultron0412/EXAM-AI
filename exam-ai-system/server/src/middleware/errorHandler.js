import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (err, _req, res, _next) => {
  const statusCode =
    err instanceof ApiError
      ? err.statusCode
      : Number.isInteger(err.statusCode)
        ? err.statusCode
        : 500;

  if (statusCode >= 500) {
    logger.error("Unhandled server error", {
      message: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    message: err.message || "Internal server error",
    details: err.details ?? null,
  });
};

