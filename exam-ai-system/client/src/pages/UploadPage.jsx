import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnalyticsPreview from "../components/AnalyticsPreview";
import AppLayout from "../layouts/AppLayout";
import { api, apiErrorMessage } from "../services/api";

const UploadPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [paperFile, setPaperFile] = useState(null);
  const [syllabusText, setSyllabusText] = useState("");
  const [paperText, setPaperText] = useState("");
  const [paperYear, setPaperYear] = useState("");
  const [weights, setWeights] = useState({ frequency: 0.5, recency: 0.4, marks: 0.1 });
  const [selectedSyllabusId, setSelectedSyllabusId] = useState("");
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [topN, setTopN] = useState(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const syllabusDocs = useMemo(
    () => documents.filter((doc) => doc.type === "syllabus"),
    [documents],
  );
  const paperDocs = useMemo(
    () => documents.filter((doc) => doc.type === "past_paper"),
    [documents],
  );

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const { data } = await api.get("/files");
      setDocuments(data.documents || []);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load documents"));
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const uploadSyllabus = async () => {
    setError("");
    setMessage("");
    try {
      if (syllabusFile) {
        const formData = new FormData();
        formData.append("file", syllabusFile);
        await api.post("/files/syllabus", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (syllabusText.trim()) {
        await api.post("/files/syllabus", {
          textContent: syllabusText,
          title: "syllabus-text",
        });
      } else {
        setError("Provide syllabus file or syllabus text.");
        return;
      }
      setMessage("Syllabus uploaded successfully.");
      setSyllabusFile(null);
      setSyllabusText("");
      await fetchDocuments();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to upload syllabus"));
    }
  };

  const uploadPastPaper = async () => {
    setError("");
    setMessage("");
    try {
      if (paperFile) {
        const formData = new FormData();
        formData.append("file", paperFile);
        if (paperYear) {
          formData.append("year", paperYear);
        }
        await api.post("/files/papers", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (paperText.trim()) {
        await api.post("/files/papers", {
          textContent: paperText,
          title: "past-paper-text",
          year: paperYear || undefined,
        });
      } else {
        setError("Provide past paper file or past paper text.");
        return;
      }
      setMessage("Past paper uploaded successfully.");
      setPaperFile(null);
      setPaperText("");
      setPaperYear("");
      await fetchDocuments();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to upload past paper"));
    }
  };

  const togglePaperId = (paperId) => {
    setSelectedPaperIds((prev) =>
      prev.includes(paperId) ? prev.filter((id) => id !== paperId) : [...prev, paperId],
    );
  };

  const runAnalysis = async () => {
    setError("");
    setMessage("");
    if (!selectedSyllabusId || selectedPaperIds.length === 0) {
      setError("Select one syllabus and at least one past paper.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/predictions/analyze", {
        syllabusDocumentId: selectedSyllabusId,
        paperDocumentIds: selectedPaperIds,
        weights,
        topN,
      });
      localStorage.setItem("exam_ai_last_analysis", JSON.stringify(data.analysis));
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Analysis failed"));
    } finally {
      setLoading(false);
    }
  };

  const totalSelected = Number(Boolean(selectedSyllabusId)) + selectedPaperIds.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="grid items-center gap-8 rounded-lg border border-aqua-400/20 bg-brand-950/[0.65] p-5 shadow-soft lg:grid-cols-[1fr_0.95fr] lg:p-7">
          <div className="max-w-2xl">
            <p className="eyebrow">Prediction workspace</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Upload exam material and turn it into a focused question forecast.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              Add a syllabus and past papers, tune scoring weights, then run AI analysis to
              generate topic priorities, predicted questions, and a short study plan.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
                <p className="text-2xl font-bold text-aqua-200">{syllabusDocs.length}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Syllabus files</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
                <p className="text-2xl font-bold text-mint-300">{paperDocs.length}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Past papers</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
                <p className="text-2xl font-bold text-white">{totalSelected}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Selected inputs</p>
              </div>
            </div>
          </div>
          <AnalyticsPreview className="hidden lg:block" />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-3">
            <div>
              <p className="eyebrow">Step 1</p>
              <h2 className="panel-title mt-1">Upload Syllabus</h2>
            </div>
            <input
              accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
              className="input"
              onChange={(event) => setSyllabusFile(event.target.files?.[0] || null)}
              type="file"
            />
            <p className="text-xs text-slate-400">or paste syllabus text</p>
            <textarea
              className="input min-h-28"
              onChange={(event) => setSyllabusText(event.target.value)}
              placeholder="Paste syllabus text..."
              value={syllabusText}
            />
            <button className="btn-primary" onClick={uploadSyllabus} type="button">
              Upload Syllabus
            </button>
          </div>

          <div className="card space-y-3">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2 className="panel-title mt-1">Upload Past Question Paper</h2>
            </div>
            <input
              accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
              className="input"
              onChange={(event) => setPaperFile(event.target.files?.[0] || null)}
              type="file"
            />
            <div>
              <label className="field-label">Year (optional)</label>
              <input
                className="input"
                onChange={(event) => setPaperYear(event.target.value)}
                placeholder="2024"
                type="number"
                value={paperYear}
              />
            </div>
            <p className="text-xs text-slate-400">or paste paper text</p>
            <textarea
              className="input min-h-28"
              onChange={(event) => setPaperText(event.target.value)}
              placeholder="Paste paper text..."
              value={paperText}
            />
            <button className="btn-primary" onClick={uploadPastPaper} type="button">
              Upload Past Paper
            </button>
          </div>
        </section>

        {message ? <p className="status-success">{message}</p> : null}
        {error ? <p className="status-error">{error}</p> : null}

        <section className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Step 3</p>
              <h2 className="panel-title mt-1">Select Documents for Analysis</h2>
            </div>
            <span className="rounded-lg border border-aqua-400/25 bg-aqua-400/10 px-3 py-2 text-xs font-semibold text-aqua-200">
              {topN} predictions
            </span>
          </div>
          {loadingDocs ? <p className="muted-text">Loading documents...</p> : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Syllabus</h3>
              <div className="mt-2 space-y-2">
                {syllabusDocs.map((doc) => (
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-aqua-400/[0.45] hover:bg-white/10"
                    key={doc.id}
                  >
                    <input
                      checked={selectedSyllabusId === doc.id}
                      name="syllabus"
                      onChange={() => setSelectedSyllabusId(doc.id)}
                      type="radio"
                    />
                    <span className="min-w-0 truncate text-sm text-slate-200">{doc.originalName}</span>
                  </label>
                ))}
                {!syllabusDocs.length ? (
                  <p className="muted-text">No syllabus uploaded.</p>
                ) : null}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Past Papers</h3>
              <div className="mt-2 space-y-2">
                {paperDocs.map((doc) => (
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-mint-400/[0.45] hover:bg-white/10"
                    key={doc.id}
                  >
                    <input
                      checked={selectedPaperIds.includes(doc.id)}
                      onChange={() => togglePaperId(doc.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0 truncate text-sm text-slate-200">
                      {doc.originalName} {doc.sourceYear ? `(${doc.sourceYear})` : ""}
                    </span>
                  </label>
                ))}
                {!paperDocs.length ? (
                  <p className="muted-text">No past papers uploaded.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="field-label">Frequency Weight</label>
              <input
                className="input"
                max="1"
                min="0"
                onChange={(event) =>
                  setWeights((prev) => ({ ...prev, frequency: Number(event.target.value) }))
                }
                step="0.1"
                type="number"
                value={weights.frequency}
              />
            </div>
            <div>
              <label className="field-label">Recency Weight</label>
              <input
                className="input"
                max="1"
                min="0"
                onChange={(event) =>
                  setWeights((prev) => ({ ...prev, recency: Number(event.target.value) }))
                }
                step="0.1"
                type="number"
                value={weights.recency}
              />
            </div>
            <div>
              <label className="field-label">Marks Weight</label>
              <input
                className="input"
                max="1"
                min="0"
                onChange={(event) =>
                  setWeights((prev) => ({ ...prev, marks: Number(event.target.value) }))
                }
                step="0.1"
                type="number"
                value={weights.marks}
              />
            </div>
            <div>
              <label className="field-label">Predicted Questions</label>
              <input
                className="input"
                max="30"
                min="25"
                onChange={(event) => setTopN(Number(event.target.value))}
                type="number"
                value={topN}
              />
            </div>
          </div>

          <button className="btn-primary" disabled={loading} onClick={runAnalysis} type="button">
            {loading ? "Analyzing..." : "Analyze and Predict"}
          </button>
        </section>
      </div>
    </AppLayout>
  );
};

export default UploadPage;
