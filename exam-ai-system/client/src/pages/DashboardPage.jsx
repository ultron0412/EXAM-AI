import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../layouts/AppLayout";
import PlannerCard from "../components/PlannerCard";
import QuestionList from "../components/QuestionList";
import TopicHeatmap from "../components/TopicHeatmap";
import { api, apiErrorMessage } from "../services/api";

const formatQuestionText = (text = "") =>
  String(text)
    .replace(/\s+/g, " ")
    .replace(/\s+([?.!,;:])/g, "$1")
    .trim();

const questionTypeLabel = (type = "") => {
  const labels = {
    short_note: "Short Note",
    structured: "7-mark Structured",
    long_derivation: "8-mark Derivation",
    long_numerical: "8-mark Numerical",
    long_discussion: "8-mark Long Answer",
  };
  return labels[type] || type || "Theory";
};

const DashboardPage = () => {
  const [analysis, setAnalysis] = useState(() => {
    try {
      const stored = localStorage.getItem("exam_ai_last_analysis");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!analysis);

  const confidenceChart = useMemo(
    () =>
      (analysis?.confidenceScores || []).map((score, idx) => ({
        index: idx + 1,
        confidence: Number(score),
      })),
    [analysis],
  );

  const topicChart = useMemo(
    () =>
      (analysis?.importantTopics || []).slice(0, 10).map((item) => ({
        topic: item.topic.length > 28 ? `${item.topic.slice(0, 28)}...` : item.topic,
        score: Number(item.score),
      })),
    [analysis],
  );

  const fetchLatestAnalysis = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/predictions/latest");
      setAnalysis(data.analysis);
      localStorage.setItem("exam_ai_last_analysis", JSON.stringify(data.analysis));
    } catch (err) {
      setError(apiErrorMessage(err, "No analysis available. Run analysis first."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!analysis) {
      fetchLatestAnalysis();
    }
  }, [analysis]);

  const predictedQuestions = analysis?.predictedQuestions || [];
  const mockTest = analysis?.mockTest || [];
  const averageConfidence =
    confidenceChart.length > 0
      ? confidenceChart.reduce((total, item) => total + item.confidence, 0) / confidenceChart.length
      : 0;
  const totalMarks = predictedQuestions.reduce((total, item) => total + Number(item.marks || 0), 0);
  const topTopic = analysis?.importantTopics?.[0]?.topic || "Waiting for analysis";

  const downloadPdf = async () => {
    if (!analysis?.id) return;
    try {
      const response = await api.get(`/predictions/${analysis.id}/download`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `exam-prediction-${analysis.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to download PDF report"));
    }
  };

  return (
    <AppLayout>
      {loading ? <p className="muted-text">Loading dashboard...</p> : null}
      {error ? <p className="status-error mb-4">{error}</p> : null}
      {analysis ? (
        <div className="space-y-6">
          <section className="grid gap-6 rounded-lg border border-aqua-400/20 bg-brand-950/[0.65] p-5 shadow-soft lg:grid-cols-[1fr_auto] lg:p-7">
            <div>
              <p className="eyebrow">Analytics dashboard</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                Prediction Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Review topic importance, confidence distribution, study plan, and generated
                exam-style questions from your uploaded material.
              </p>
            </div>
            <div className="flex items-start">
              <button className="btn-primary" onClick={downloadPdf} type="button">
                Download Predictions PDF
              </button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Predicted Questions", predictedQuestions.length, "Questions ranked by AI"],
              ["Average Confidence", averageConfidence.toFixed(2), "Across generated results"],
              ["Estimated Marks", totalMarks.toFixed(0), "Total marks represented"],
              ["Top Topic", topTopic, "Highest scoring area"],
            ].map(([label, value, helper]) => (
              <div className="card min-h-32" key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {label}
                </p>
                <p className="mt-3 truncate text-2xl font-bold text-white">{value}</p>
                <p className="mt-2 text-xs text-slate-400">{helper}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="panel-title">Topic Importance</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChart}>
                    <CartesianGrid stroke="#3154ba" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="topic"
                      angle={-18}
                      axisLine={{ stroke: "#3154ba" }}
                      height={70}
                      interval={0}
                      textAnchor="end"
                      tick={{ fill: "#b8cffc", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={{ stroke: "#3154ba" }}
                      tick={{ fill: "#b8cffc", fontSize: 11 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#081a4c",
                        border: "1px solid rgba(103, 232, 249, 0.28)",
                        borderRadius: 8,
                        color: "#f8fafc",
                      }}
                    />
                    <Bar dataKey="score" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="panel-title">Confidence Trend</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={confidenceChart}>
                    <CartesianGrid stroke="#3154ba" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      axisLine={{ stroke: "#3154ba" }}
                      dataKey="index"
                      tick={{ fill: "#b8cffc", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={{ stroke: "#3154ba" }}
                      domain={[0, 1]}
                      tick={{ fill: "#b8cffc", fontSize: 11 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#081a4c",
                        border: "1px solid rgba(103, 232, 249, 0.28)",
                        borderRadius: 8,
                        color: "#f8fafc",
                      }}
                    />
                    <Line
                      dataKey="confidence"
                      dot={{ fill: "#67e8f9", r: 3, stroke: "#10b981", strokeWidth: 2 }}
                      stroke="#22d3ee"
                      strokeWidth={3}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="panel-title">Topic Heatmap</h2>
              <div className="mt-3">
                <TopicHeatmap data={analysis.topicHeatmap || []} />
              </div>
            </div>
            <div className="card">
              <h2 className="panel-title">Study In 3 Days Planner</h2>
              <div className="mt-3">
                <PlannerCard planner={analysis.twoDayPlanner || []} />
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="panel-title">Predicted Questions</h2>
            <div className="mt-3">
              <QuestionList questions={predictedQuestions} />
            </div>
          </section>

          <section className="card">
            <h2 className="panel-title">Mock Test Generator Output</h2>
            <div className="mt-3 space-y-3">
              {mockTest.length ? (
                mockTest.map((q, idx) => (
                  <div
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                    key={`${q.question}-${idx}`}
                  >
                    <p className="text-sm font-semibold leading-6 text-white">
                      {idx + 1}. {formatQuestionText(q.question)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {q.topic} | {questionTypeLabel(q.questionType || q.question_type)} |{" "}
                      {Number(q.marks).toFixed(0)} marks
                    </p>
                  </div>
                ))
              ) : (
                <p className="muted-text">No mock test generated yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </AppLayout>
  );
};

export default DashboardPage;
