import fs from "fs/promises";
import path from "path";
import { env } from "../config/env.js";
import { Document } from "../models/Document.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { detectYear, getExtension } from "../utils/documentUtils.js";

const createTextDocumentFile = async ({ bucket, originalName, textContent }) => {
  const destinationDir = path.resolve(env.uploadDir, bucket);
  await fs.mkdir(destinationDir, { recursive: true });

  const baseName = (originalName || "uploaded-text")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "");

  const fileName = `${Date.now()}-${baseName}.txt`;
  const storagePath = path.join(destinationDir, fileName);
  await fs.writeFile(storagePath, textContent, "utf8");

  return {
    originalname: `${baseName}.txt`,
    mimetype: "text/plain",
    size: Buffer.byteLength(textContent, "utf8"),
    path: storagePath,
    filename: fileName,
  };
};

const persistDocument = async ({ ownerId, file, type, extractedText, sourceYear }) => {
  const ext = getExtension(file.originalname || file.filename) || "txt";
  const doc = await Document.create({
    ownerId,
    type,
    originalName: file.originalname || file.filename,
    storagePath: file.path,
    mimeType: file.mimetype || "text/plain",
    extension: ext,
    sizeBytes: file.size || 0,
    sourceYear,
    extractedText: extractedText ?? "",
  });

  return {
    id: doc._id.toString(),
    type: doc.type,
    originalName: doc.originalName,
    sourceYear: doc.sourceYear ?? null,
    uploadedAt: doc.createdAt,
  };
};

export const uploadSyllabus = asyncHandler(async (req, res) => {
  const { textContent, title } = req.body;
  let file = req.file;
  if (!file && textContent) {
    file = await createTextDocumentFile({
      bucket: "syllabus",
      originalName: title || "syllabus",
      textContent,
    });
  }
  if (!file) {
    throw new ApiError(400, "Upload a file or provide textContent");
  }

  const document = await persistDocument({
    ownerId: req.user.id,
    file,
    type: "syllabus",
    extractedText: textContent || "",
  });

  res.status(201).json({ message: "Syllabus uploaded", document });
});

export const uploadPastPaper = asyncHandler(async (req, res) => {
  const { textContent, title, year } = req.body;
  let file = req.file;
  if (!file && textContent) {
    file = await createTextDocumentFile({
      bucket: "papers",
      originalName: title || "past-paper",
      textContent,
    });
  }
  if (!file) {
    throw new ApiError(400, "Upload a file or provide textContent");
  }

  const inferredYear =
    Number.parseInt(year ?? "", 10) || detectYear(file.originalname) || undefined;

  const document = await persistDocument({
    ownerId: req.user.id,
    file,
    type: "past_paper",
    sourceYear: inferredYear,
    extractedText: textContent || "",
  });

  res.status(201).json({ message: "Past paper uploaded", document });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ ownerId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();
  const payload = docs.map((doc) => ({
    id: doc._id.toString(),
    type: doc.type,
    originalName: doc.originalName,
    sourceYear: doc.sourceYear ?? null,
    uploadedAt: doc.createdAt,
    sizeBytes: doc.sizeBytes,
  }));
  res.status(200).json({ documents: payload });
});

