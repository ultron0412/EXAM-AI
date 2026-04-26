import path from "path";

export const detectYear = (fileName = "") => {
  const matches = fileName.match(/(19|20)\d{2}/g);
  if (!matches?.length) {
    return null;
  }
  return Number.parseInt(matches[matches.length - 1], 10);
};

export const getExtension = (fileName = "") =>
  path.extname(fileName || "").replace(".", "").toLowerCase();

