import { Types } from "mongoose";
import { Analysis } from "../models/Analysis.js";
import { Document } from "../models/Document.js";
import { ApiError } from "../utils/ApiError.js";
import { requestAnalysis, requestMockTest } from "./aiClientService.js";

const ensureObjectIds = (ids = []) => {
  const validIds = ids.filter((id) => Types.ObjectId.isValid(id)).map(String);
  if (!validIds.length) {
    throw new ApiError(400, "Valid paperDocumentIds are required");
  }
  return validIds;
};

const normalizeQuestion = (item = {}) => ({
  question: item.question ?? "",
  explanation: item.explanation ?? "",
  topic: item.topic ?? "General",
  questionType: item.question_type ?? item.questionType ?? "theory",
  marks: Number(item.marks ?? 0),
  confidence: Number(item.confidence ?? 0),
});

const buildTwoDayPlanner = (topics = []) => {
  const top = topics.slice(0, 8).map((item) => item.topic);
  const dayOne = top.filter((_, idx) => idx % 2 === 0);
  const dayTwo = top.filter((_, idx) => idx % 2 === 1);
  return [
    {
      day: 1,
      topics: dayOne,
      targetHours: 8,
      notes: "Focus on high-frequency theory and formula revision.",
    },
    {
      day: 2,
      topics: dayTwo,
      targetHours: 8,
      notes: "Solve timed practice sets and revise mistakes.",
    },
  ];
};

export const runAnalysis = async ({
  ownerId,
  syllabusDocumentId,
  paperDocumentIds,
  weights,
  topN,
}) => {
  if (!Types.ObjectId.isValid(syllabusDocumentId)) {
    throw new ApiError(400, "Valid syllabusDocumentId is required");
  }

  const validPaperIds = ensureObjectIds(paperDocumentIds);

  const [syllabusDoc, paperDocs] = await Promise.all([
    Document.findOne({ _id: syllabusDocumentId, ownerId, type: "syllabus" }),
    Document.find({
      _id: { $in: validPaperIds },
      ownerId,
      type: "past_paper",
    }),
  ]);

  if (!syllabusDoc) {
    throw new ApiError(404, "Syllabus document not found");
  }
  if (!paperDocs.length) {
    throw new ApiError(404, "Past paper documents not found");
  }

  const aiInput = {
    syllabus: {
      id: syllabusDoc._id.toString(),
      path: syllabusDoc.storagePath,
      extracted_text: syllabusDoc.extractedText,
      original_name: syllabusDoc.originalName,
    },
    past_papers: paperDocs.map((doc) => ({
      id: doc._id.toString(),
      path: doc.storagePath,
      extracted_text: doc.extractedText,
      original_name: doc.originalName,
      year: doc.sourceYear,
    })),
    weights,
    top_n: topN,
  };

  const analysisResponse = await requestAnalysis(aiInput);
  const importantTopics = (analysisResponse.important_topics ?? []).map((it) => ({
    topic: it.topic,
    score: Number(it.score ?? 0),
  }));
  const predictedQuestions = (analysisResponse.predicted_questions ?? []).map(
    normalizeQuestion,
  );
  const confidenceScores = (analysisResponse.confidence_scores ?? []).map((v) =>
    Number(v ?? 0),
  );
  const topicHeatmap = (analysisResponse.topic_heatmap ?? []).map((it) => ({
    topic: it.topic,
    score: Number(it.score ?? 0),
  }));

  const mockTestResponse = await requestMockTest({
    important_topics: importantTopics,
    predicted_questions: predictedQuestions,
    desired_count: 10,
  });

  const analysis = await Analysis.create({
    ownerId,
    syllabusDocumentId,
    paperDocumentIds: paperDocs.map((doc) => doc._id),
    weights,
    importantTopics,
    predictedQuestions,
    confidenceScores,
    topicHeatmap: topicHeatmap.length ? topicHeatmap : importantTopics,
    twoDayPlanner:
      analysisResponse.two_day_planner?.length > 0
        ? analysisResponse.two_day_planner
        : buildTwoDayPlanner(importantTopics),
    mockTest: (mockTestResponse.mock_test ?? []).map(normalizeQuestion),
    aiRawResponse: analysisResponse,
  });

  return analysis;
};

