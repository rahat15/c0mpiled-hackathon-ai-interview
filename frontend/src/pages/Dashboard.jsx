import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { interview } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    interview
      .listSessions()
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
        <h1 className="text-2xl font-bold">AI Interview Platform</h1>
        <p className="text-brand-200 mt-1 text-sm">
          Upload your resume, get AI-powered evaluation, and practice realistic interviews.
        </p>
        <div className="flex gap-3 mt-5">
          <Link to="/resume/upload" className="bg-white text-brand-700 font-medium py-2 px-5 rounded-xl hover:bg-brand-50 transition-colors text-sm">
            Upload Resume
          </Link>
          <Link to="/interview/setup" className="bg-brand-500 text-white font-medium py-2 px-5 rounded-xl hover:bg-brand-400 border border-brand-400 transition-colors text-sm">
            Start Interview
          </Link>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/resume/upload" className="card hover:shadow-md transition-shadow group">
          <div className="text-3xl mb-3">📄</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-brand-600">Upload & Evaluate Resume</h3>
          <p className="text-sm text-slate-500 mt-1">Upload, get AI analysis, and score against a JD</p>
        </Link>
        <Link to="/interview/setup" className="card hover:shadow-md transition-shadow group">
          <div className="text-3xl mb-3">🎤</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-brand-600">Mock Interview</h3>
          <p className="text-sm text-slate-500 mt-1">Practice with an AI interviewer</p>
        </Link>
      </div>

      {/* ── Interview History ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Interview History</h2>
        {loading ? (
          <LoadingSpinner text="Loading interviews…" />
        ) : error ? (
          <div className="card text-red-500 text-sm">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="card text-center text-slate-500 py-10">
            <div className="text-4xl mb-2">💬</div>
            No interviews yet. Start your first one!
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sessions.map((s) => (
              <div key={s.session_id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${s.is_complete ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <span className="font-medium text-slate-700 text-sm capitalize">{s.personality}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Stage: {s.stage} · Questions: {s.question_count}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!s.is_complete && (
                    <Link to={`/interview/${s.session_id}`} className="btn-primary text-xs py-1.5 px-3">
                      Continue
                    </Link>
                  )}
                  {s.has_report && (
                    <Link to={`/report/${s.session_id}`} className="btn-secondary text-xs py-1.5 px-3">
                      Report
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
