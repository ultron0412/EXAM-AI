const withTimestamp = (level, message, meta = {}) => {
  const ts = new Date().toISOString();
  if (Object.keys(meta).length) {
    // eslint-disable-next-line no-console
    console[level](`[${ts}] ${message}`, meta);
    return;
  }
  // eslint-disable-next-line no-console
  console[level](`[${ts}] ${message}`);
};

export const logger = {
  info: (message, meta) => withTimestamp("log", message, meta),
  warn: (message, meta) => withTimestamp("warn", message, meta),
  error: (message, meta) => withTimestamp("error", message, meta),
};

