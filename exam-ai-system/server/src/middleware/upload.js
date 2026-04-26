import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const buildStorage = (bucket) => {
  const destinationDir = path.resolve(env.uploadDir, bucket);
  ensureDirectory(destinationDir);

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destinationDir),
    filename: (_req, file, cb) => {
      const safeOriginal = file.originalname.replace(/\s+/g, "_");
      const filename = `${Date.now()}-${safeOriginal}`;
      cb(null, filename);
    },
  });
};

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new ApiError(400, "Only PDF/TXT/DOC/DOCX files are supported"));
};

const baseOptions = {
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  fileFilter,
};

export const syllabusUpload = multer({
  storage: buildStorage("syllabus"),
  ...baseOptions,
});

export const papersUpload = multer({
  storage: buildStorage("papers"),
  ...baseOptions,
});

