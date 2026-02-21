import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { interview } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBar from "../components/ScoreBar";

const REC_COLORS = {
  "Strong Hire": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "Hire": "bg-green-100 text-green-800 border-green-300",
  "Lean Yes": "bg-lime-100 text-lime-800 border-lime-300",
  "Lean No": "bg-amber-100 text-amber-800 border-amber-300",
  "No Hire": "bg-red-100 text-red-800 border-red-300",
};

export default function FinalReport() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let attempts = 0;

    async function fetchReport() {
      try {
        // Try getting the report directly
        const data = await interview.getReport(sessionId);
        setReport(data);
        setLoading(false);
      } catch (err) {
        if (attempts < 3 && err.message?.includes("not yet completed")) {
          // Interview might still be generating the report
          attempts++;
          try {
            await interview.complete(sessionId);
          } catch {
            // may already be completed
          }
          setTimeout(fetchReport, 2000);
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchReport();
  }, [sessionId]);

  if (loading) return <LoadingSpinner text="Generating your evaluation report…" />;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <p className="text-red-500">{error}</p>
          <Link to="/" className="btn-secondary inline-block text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const recClass = REC_COLORS[report.hiringRecommendation] || "bg-slate-100 text-slate-700";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interview Report</h1>
          <p className="text-sm text-slate-500">AI-generated evaluation</p>
        </div>
        <Link to="/" className="btn-secondary text-sm">
          ← Dashboard
        </Link>
      </div>

      {/* ── Recommendation Badge ───────────────────────────────── */}
      <div className="card text-center">
        <p className="text-sm text-slate-500 mb-2">Hiring Recommendation</p>
        <span className={`inline-block text-xl font-bold px-6 py-2 rounded-full border ${recClass}`}>
          {report.hiringRecommendation}
        </span>
      </div>

      {/* ── Scores ─────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-lg text-slate-800">📊 Performance Scores</h2>
        <ScoreBar label="Technical Competency" value={report.technicalCompetency} color="auto" />
        <ScoreBar label="Problem Solving" value={report.problemSolving} color="auto" />
        <ScoreBar label="Communication" value={report.communication} color="auto" />
        <ScoreBar label="Behavioral Fit" value={report.behavioralFit} color="auto" />
      </div>

      {/* ── Strengths / Weaknesses ─────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="text-emerald-500">✅</span> Strengths
          </h2>
          {report.strengths?.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-600">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
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
            <span className="text-amber-500">⚠️</span> Weaknesses
          </h2>
          {report.weaknesses?.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-600">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
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
          <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
            {report.improvementPlan.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex gap-3 justify-center pb-4">
        <Link to="/interview/setup" className="btn-primary text-sm">
          🎤 New Interview
        </Link>
        <Link to="/" className="btn-secondary text-sm">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
