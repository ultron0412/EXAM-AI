import PDFDocument from "pdfkit";
import { Analysis } from "../models/Analysis.js";
import { runAnalysis } from "../services/analysisService.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const parseWeights = (weights = {}) => {
  const frequency = Number(weights.frequency ?? 0.5);
  const recency = Number(weights.recency ?? 0.3);
  const marks = Number(weights.marks ?? 0.2);
  const total = frequency + recency + marks;
  if (total <= 0) {
    return { frequency: 0.5, recency: 0.3, marks: 0.2 };
  }
  return {
    frequency: frequency / total,
    recency: recency / total,
    marks: marks / total,
  };
};

const formatAnalysis = (analysis) => ({
  id: analysis._id.toString(),
  importantTopics: analysis.importantTopics,
  predictedQuestions: analysis.predictedQuestions,
  confidenceScores: analysis.confidenceScores,
  topicHeatmap: analysis.topicHeatmap,
  twoDayPlanner: analysis.twoDayPlanner,
  mockTest: analysis.mockTest,
  createdAt: analysis.createdAt,
});

export const analyze = asyncHandler(async (req, res) => {
  const { syllabusDocumentId, paperDocumentIds, weights, topN = 12 } = req.body;
  const analysis = await runAnalysis({
    ownerId: req.user.id,
    syllabusDocumentId,
    paperDocumentIds,
    weights: parseWeights(weights),
    topN: Number(topN),
  });

  res.status(200).json({
    message: "Analysis completed successfully",
    analysis: formatAnalysis(analysis),
  });
});

export const predict = asyncHandler(async (req, res) => {
  const { analysisId, syllabusDocumentId, paperDocumentIds, weights, topN = 12 } =
    req.body;

  let analysis;
  if (analysisId) {
    analysis = await Analysis.findOne({ _id: analysisId, ownerId: req.user.id });
    if (!analysis) {
      throw new ApiError(404, "Analysis record not found");
    }
  } else {
    analysis = await runAnalysis({
      ownerId: req.user.id,
      syllabusDocumentId,
      paperDocumentIds,
      weights: parseWeights(weights),
      topN: Number(topN),
    });
  }

  res.status(200).json({
    predicted_questions: analysis.predictedQuestions,
    confidence_scores: analysis.confidenceScores,
    important_topics: analysis.importantTopics,
    topic_heatmap: analysis.topicHeatmap,
    two_day_planner: analysis.twoDayPlanner,
    mock_test: analysis.mockTest,
    analysis_id: analysis._id.toString(),
  });
});

export const latestAnalysis = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({ ownerId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();
  if (!analysis) {
    throw new ApiError(404, "No analysis found for user");
  }

  res.status(200).json({ analysis: formatAnalysis(analysis) });
});

export const downloadAnalysisPdf = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({
    _id: req.params.analysisId,
    ownerId: req.user.id,
  }).lean();
  if (!analysis) {
    throw new ApiError(404, "Analysis not found");
  }

  const filename = `exam-prediction-${analysis._id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Exam Question Prediction Report", { underline: true });
  doc.moveDown();
  doc.fontSize(10).text(`Generated At: ${new Date().toISOString()}`);
  doc.moveDown();

  doc.fontSize(14).text("Important Topics");
  analysis.importantTopics.forEach((item, idx) => {
    doc.fontSize(11).text(
      `${idx + 1}. ${item.topic} (Score: ${item.score.toFixed(3)})`,
    );
  });

  doc.moveDown();
  doc.fontSize(14).text("Predicted Questions");
  analysis.predictedQuestions.forEach((question, idx) => {
    doc.fontSize(11).text(
      `${idx + 1}. ${question.question} [${question.topic}] (Confidence: ${question.confidence.toFixed(2)})`,
    );
    if (question.explanation) {
      doc.fontSize(10).fillColor("gray").text(question.explanation);
      doc.fillColor("black");
    }
    doc.moveDown(0.4);
  });

  doc.moveDown();
  doc.fontSize(14).text("Study in 2 Days Planner");
  analysis.twoDayPlanner.forEach((item) => {
    doc
      .fontSize(11)
      .text(`Day ${item.day} (${item.targetHours} hrs): ${item.topics.join(", ")}`);
    if (item.notes) {
      doc.fontSize(10).fillColor("gray").text(item.notes);
      doc.fillColor("black");
    }
  });

  doc.end();
});

