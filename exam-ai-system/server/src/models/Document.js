import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["syllabus", "past_paper"],
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    sourceYear: {
      type: Number,
      min: 1990,
      max: 2100,
    },
    extractedText: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export const Document = mongoose.model("Document", documentSchema);

