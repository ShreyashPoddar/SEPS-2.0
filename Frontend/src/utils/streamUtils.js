// Frontend/src/utils/streamUtils.js

/**
 * Splits raw stream string (e.g. "CSE, ECE" or "ECE/IT") into clean individual tokens.
 * @param {string} streamStr 
 * @returns {string[]}
 */
export const parseStreams = (streamStr) => {
  if (!streamStr || typeof streamStr !== "string") return [];
  return streamStr
    .split(/[,/;&|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
};
