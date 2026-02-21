import { useState } from "react";
import { useLocation } from "react-router-dom";
import { resume } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBar from "../components/ScoreBar";

export default function ResumeEvaluate() {
  const location = useLocation();
  const [resumeId, setResumeId] = useState(location.state?.resumeId || "");
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [useFile, setUseFile] = useState(!location.state?.resumeId);

  async function handleEvaluate(e) {
    e.preventDefault();
    if (!useFile && !resumeId) {
      setError("Enter a resume ID or upload a file");
      return;
    }
    if (useFile && !file) {
      setError("Select a file to upload");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await resume.evaluate({
        resumeId: useFile ? null : resumeId,
        file: useFile ? file : null,
        jdText: jdText || null,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Evaluate Resume</h1>
        <p className="text-slate-500 text-sm mt-1">
          Get AI scoring on your resume. Add a job description for JD match analysis.
        </p>
      </div>

      {/* ── Form ───────────────────────────────────────────────── */}
      <form onSubmit={handleEvaluate} className="card space-y-5">
        {/* Source toggle */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setUseFile(false)} className={`text-sm py-1.5 px-4 rounded-lg font-medium transition-colors ${!useFile ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>
            Use Resume ID
          </button>
          <button type="button" onClick={() => setUseFile(true)} className={`text-sm py-1.5 px-4 rounded-lg font-medium transition-colors ${useFile ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>
            Upload New File
          </button>
        </div>

        {useFile ? (
          <div>
            <label className="label">Resume File</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.rtf,.html,.htm,.odt,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input"
            />
          </div>
        ) : (
          <div>
            <label className="label">Resume ID</label>
            <input
              type="text"
              className="input font-mono text-sm"
              placeholder="Paste your resume_id here"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="label">Job Description (optional)</label>
          <textarea
            className="input min-h-[120px] resize-y"
            placeholder="Paste the job description here for JD match analysis, skill gaps, tailored resume, and cover letter…"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-200">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Evaluating…" : "Evaluate"}
        </button>
      </form>

      {loading && <LoadingSpinner text="Running AI evaluation — this may take 10-20 seconds…" />}

      {/* ── Results ────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6">
          {/* CV Quality */}
          <section className="card">
            <h2 className="font-semibold text-lg text-slate-800 mb-4">📊 CV Quality</h2>
            {result.cv_quality && (
              <div className="space-y-3">
                <ScoreBar label="Overall Score" value={result.cv_quality.overall_score} color="auto" />
                <ScoreBar label="Formatting" value={result.cv_quality.formatting} color="auto" />
                <ScoreBar label="Content Depth" value={result.cv_quality.content_depth} color="auto" />
                <ScoreBar label="Impact Statements" value={result.cv_quality.impact_statements} color="auto" />
                <ScoreBar label="Keyword Optimization" value={result.cv_quality.keyword_optimization} color="auto" />
                {result.cv_quality.summary && (
                  <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-xl p-3">{result.cv_quality.summary}</p>
                )}
              </div>
            )}
          </section>

          {/* JD Match */}
          {result.jd_match && (
            <section className="card">
              <h2 className="font-semibold text-lg text-slate-800 mb-4">🎯 JD Match</h2>
              <div className="space-y-3">
                <ScoreBar label="Relevance" value={result.jd_match.relevance_score} color="auto" />
                <ScoreBar label="Experience Alignment" value={result.jd_match.experience_alignment} color="auto" />
                {result.jd_match.matched_skills?.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">Matched Skills:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {result.jd_match.matched_skills.map((s, i) => (
                        <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.jd_match.missing_skills?.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">Missing Skills:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {result.jd_match.missing_skills.map((s, i) => (
                        <span key={i} className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.jd_match.summary && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{result.jd_match.summary}</p>
                )}
              </div>
            </section>
          )}

          {/* Skill Gaps */}
          {result.skill_gaps?.length > 0 && (
            <section className="card">
              <h2 className="font-semibold text-lg text-slate-800 mb-3">⚠️ Skill Gaps</h2>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {result.skill_gaps.map((g, i) => (
                  <li key={i} className="flex gap-2"><span className="text-amber-500">•</span> {g}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Improvement Suggestions */}
          {result.improvement_suggestions?.length > 0 && (
            <section className="card">
              <h2 className="font-semibold text-lg text-slate-800 mb-3">💡 Improvement Suggestions</h2>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {result.improvement_suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-brand-500">•</span> {s}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Tailored Resume */}
          {result.tailored_resume && (
            <section className="card">
              <h2 className="font-semibold text-lg text-slate-800 mb-3">📝 Tailored Resume</h2>
              <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                {result.tailored_resume}
              </pre>
            </section>
          )}

          {/* Cover Letter */}
          {result.cover_letter && (
            <section className="card">
              <h2 className="font-semibold text-lg text-slate-800 mb-3">✉️ Cover Letter</h2>
              <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                {result.cover_letter}
              </pre>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
