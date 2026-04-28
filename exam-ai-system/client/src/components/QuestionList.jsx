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

const metaItems = (q) => [
  q.topic ? `Topic: ${q.topic}` : null,
  `Type: ${questionTypeLabel(q.questionType || q.question_type)}`,
  `Marks: ${Number(q.marks || 0).toFixed(0)}`,
  `Confidence: ${Number(q.confidence || 0).toFixed(2)}`,
];

const QuestionList = ({ questions = [] }) => {
  if (!questions.length) {
    return <p className="muted-text">No predicted questions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {questions.map((q, index) => (
        <article
          className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm transition hover:border-aqua-400/35 hover:bg-white/[0.08]"
          key={`${q.question}-${index}`}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-aqua-400/35 bg-aqua-400/10 text-xs font-bold text-aqua-200">
              {index + 1}
            </span>
            <p className="min-w-0 text-sm font-semibold leading-6 text-white">
              {formatQuestionText(q.question)}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {metaItems(q)
              .filter(Boolean)
              .map((item) => (
                <span
                  className="rounded-md border border-white/10 bg-brand-900/75 px-2 py-1 text-xs font-medium text-slate-300"
                  key={item}
                >
                  {item}
                </span>
              ))}
          </div>
          {q.explanation ? (
            <p className="mt-3 border-l-2 border-mint-400/[0.45] pl-3 text-sm leading-6 text-slate-300">
              {q.explanation}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
};

export default QuestionList;
