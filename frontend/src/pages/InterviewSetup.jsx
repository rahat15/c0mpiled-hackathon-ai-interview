import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { interview } from "../api/client";

const PERSONALITIES = [
  { value: "friendly", label: "😊 Friendly", desc: "Warm, encouraging, great for first-timers" },
  { value: "strict", label: "🧐 Strict", desc: "Direct and rigorous, challenges your depth" },
  { value: "startup_cto", label: "🚀 Startup CTO", desc: "Fast-paced, pragmatic, real-world focus" },
];

export default function InterviewSetup() {
  const location = useLocation();
  const navigate = useNavigate();
  const [resumeId, setResumeId] = useState(location.state?.resumeId || "");
  const [jdText, setJdText] = useState("");
  const [personality, setPersonality] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart(e) {
    e.preventDefault();
    if (!resumeId.trim()) {
      setError("Please enter a Resume ID. Upload a resume first to get one.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await interview.createSession(resumeId.trim(), jdText, personality);
      navigate(`/interview/${data.session_id}`, {
        state: { firstQuestion: data.question, stage: data.stage },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Start Interview</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure your AI mock interview session.
        </p>
      </div>

      <form onSubmit={handleStart} className="card space-y-5">
        {/* Resume ID */}
        <div>
          <label className="label">Resume ID *</label>
          <input
            type="text"
            className="input font-mono text-sm"
            placeholder="Paste resume_id from upload step"
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            required
          />
          <p className="text-xs text-slate-400 mt-1">Upload a resume first to get this ID</p>
        </div>

        {/* JD */}
        <div>
          <label className="label">Job Description (optional)</label>
          <textarea
            className="input min-h-[100px] resize-y"
            placeholder="Paste the target job description for a more tailored interview…"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </div>

        {/* Personality */}
        <div>
          <label className="label">Interviewer Personality</label>
          <div className="grid sm:grid-cols-3 gap-3 mt-1">
            {PERSONALITIES.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setPersonality(p.value)}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${
                  personality === p.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-200">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Starting Interview…" : "🎤 Start Interview"}
        </button>
      </form>
    </div>
  );
}
