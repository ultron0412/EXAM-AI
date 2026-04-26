import mongoose from "mongoose";

const topicScoreSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    explanation: { type: String, default: "" },
    topic: { type: String, required: true },
    questionType: { type: String, default: "theory" },
    marks: { type: Number, default: 0 },
    confidence: { type: Number, required: true },
  },
  { _id: false },
);

const plannerItemSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    topics: { type: [String], default: [] },
    targetHours: { type: Number, required: true },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const analysisSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    syllabusDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    paperDocumentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true,
      },
    ],
    weights: {
      frequency: { type: Number, default: 0.5 },
      recency: { type: Number, default: 0.3 },
      marks: { type: Number, default: 0.2 },
    },
    importantTopics: { type: [topicScoreSchema], default: [] },
    predictedQuestions: { type: [questionSchema], default: [] },
    confidenceScores: { type: [Number], default: [] },
    topicHeatmap: { type: [topicScoreSchema], default: [] },
    twoDayPlanner: { type: [plannerItemSchema], default: [] },
    mockTest: { type: [questionSchema], default: [] },
    aiRawResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

analysisSchema.index({ ownerId: 1, createdAt: -1 });

export const Analysis = mongoose.model("Analysis", analysisSchema);

