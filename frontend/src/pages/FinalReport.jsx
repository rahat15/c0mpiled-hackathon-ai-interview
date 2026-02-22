import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { interview } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBar from "../components/ScoreBar";

/* ── Constants ──────────────────────────────────────── */
const REC_COLORS = {
  "Strong Hire": { bg: "bg-emerald-500", ring: "ring-emerald-200", text: "text-white" },
  Hire:          { bg: "bg-green-500",   ring: "ring-green-200",   text: "text-white" },
  "Lean Yes":    { bg: "bg-lime-500",    ring: "ring-lime-200",    text: "text-white" },
  "Lean No":     { bg: "bg-amber-500",   ring: "ring-amber-200",   text: "text-white" },
  "No Hire":     { bg: "bg-red-500",     ring: "ring-red-200",     text: "text-white" },
};

const SCORE_ICONS = {
  "Technical Competency": "💻",
  "Problem Solving": "🧩",
  Communication: "💬",
  "Behavioral Fit": "🤝",
};

/* ── Tiny donut for overall score ───────────────────── */
function ScoreDonut({ value }) {
  const pct = Math.round(value * 100);
  const r = 54, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-800">{pct}</span>
        <span className="text-[10px] text-slate-400 -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export default function FinalReport() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQA, setShowQA] = useState(false);

  useEffect(() => {
    let attempts = 0;

    async function fetchData() {
      try {
        const [reportData, sessionData] = await Promise.all([
          interview.getReport(sessionId),
          interview.getSession(sessionId).catch(() => null),
        ]);
        setReport(reportData);
        setSession(sessionData);
        setLoading(false);
      } catch (err) {
        if (attempts < 3 && err.message?.includes("not yet completed")) {
          attempts++;
          try { await interview.complete(sessionId); } catch { /* noop */ }
          setTimeout(fetchData, 2000);
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [sessionId]);

  if (loading) return <LoadingSpinner text="Generating your evaluation report…" />;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <p className="text-red-500">{error}</p>
          <Link to="/" className="btn-secondary inline-block text-sm">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const rec = report.hiringRecommendation || "N/A";
  const recStyle = REC_COLORS[rec] || { bg: "bg-slate-500", ring: "ring-slate-200", text: "text-white" };

  const scores = [
    { key: "technicalCompetency", label: "Technical Competency" },
    { key: "problemSolving",      label: "Problem Solving" },
    { key: "communication",       label: "Communication" },
    { key: "behavioralFit",       label: "Behavioral Fit" },
  ];
  const overall =
    scores.reduce((sum, s) => sum + (report[s.key] ?? 0), 0) / scores.length;

  // Build Q&A pairs from session history
  const qaPairs = [];
  if (session?.history) {
    let currentQ = null;
    for (const h of session.history) {
      if (h.role === "interviewer") {
        currentQ = h.content;
      } else if (h.role === "candidate" || h.role === "user") {
        if (currentQ) {
          qaPairs.push({ question: currentQ, answer: h.content });
          currentQ = null;
        }
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interview Report</h1>
          <p className="text-sm text-slate-400">AI-generated evaluation • Session {sessionId.slice(0, 8)}</p>
        </div>
        <Link to="/" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      {/* ── Hero: Overall Score + Recommendation ───────────────── */}
      <div className="card !p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-8 flex flex-col md:flex-row items-center gap-6 text-white">
          <div className="bg-white rounded-full p-2 shadow-lg">
            <ScoreDonut value={overall} />
          </div>
          <div className="text-center md:text-left flex-1">
            <p className="text-sm opacity-80 mb-1">Overall Performance</p>
            <p className="text-3xl font-extrabold mb-3">
              {Math.round(overall * 100)}
              <span className="text-lg font-normal opacity-70"> / 100</span>
            </p>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ring-2 ${recStyle.bg} ${recStyle.ring} ${recStyle.text} text-sm font-bold shadow-md`}>
              {rec === "Strong Hire" || rec === "Hire" ? "🎉" : rec === "No Hire" ? "❌" : "⚡"}
              {rec}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {scores.map((s) => {
              const v = Math.round((report[s.key] ?? 0) * 100);
              return (
                <div key={s.key} className="bg-white/15 backdrop-blur rounded-xl px-4 py-2.5">
                  <div className="text-lg">{SCORE_ICONS[s.label]}</div>
                  <div className="text-xl font-bold">{v}</div>
                  <div className="text-[10px] opacity-80 leading-tight">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Detailed Scores ────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-lg text-slate-800">📊 Performance Breakdown</h2>
        {scores.map((s) => (
          <ScoreBar
            key={s.key}
            label={`${SCORE_ICONS[s.label]} ${s.label}`}
            score={Math.round((report[s.key] ?? 0) * 100)}
            maxScore={100}
            color="auto"
          />
        ))}
      </div>

      {/* ── Strengths / Weaknesses ─────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-sm">✅</span>
            Strengths
          </h2>
          {report.strengths?.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-600">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">None identified</p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-sm">⚠️</span>
            Areas for Improvement
          </h2>
          {report.weaknesses?.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-600">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="w-5 h-5 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">{i + 1}</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">None identified</p>
          )}
        </div>
      </div>

      {/* ── Improvement Plan ───────────────────────────────────── */}
      {report.improvementPlan?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-lg text-slate-800 mb-3">🗺️ Improvement Plan</h2>
          <div className="space-y-3">
            {report.improvementPlan.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Q&A Review ─────────────────────────────────────────── */}
      {qaPairs.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowQA(!showQA)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
              💬 Interview Q&A Review
              <span className="text-xs font-normal bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {qaPairs.length} questions
              </span>
            </h2>
            <span className={`text-slate-400 transition-transform ${showQA ? "rotate-180" : ""}`}>▼</span>
          </button>

          {showQA && (
            <div className="mt-4 space-y-4">
              {qaPairs.map((qa, i) => (
                <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-start gap-3">
                    <span className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      Q{i + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-700">{qa.question}</p>
                  </div>
                  <div className="px-4 py-3 flex items-start gap-3 bg-white">
                    <span className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      A
                    </span>
                    <p className="text-sm text-slate-600 leading-relaxed">{qa.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex gap-3 justify-center pt-2 pb-4">
        <Link to="/interview/setup" className="btn-primary text-sm">🎤 New Interview</Link>
        <Link to="/" className="btn-secondary text-sm">Dashboard</Link>
      </div>
    </div>
  );
}
