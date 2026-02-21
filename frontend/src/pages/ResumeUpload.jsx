import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { resume } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBar from "../components/ScoreBar";

/* ── helpers ─────────────────────────────────────────── */
const DIM_LABELS = {
  ats_structure: "ATS Structure",
  writing_clarity: "Writing Clarity",
  quantified_impact: "Quantified Impact",
  technical_depth: "Technical Depth",
  projects_portfolio: "Projects / Portfolio",
  leadership_skills: "Leadership & Skills",
  career_progression: "Career Progression",
  consistency: "Consistency",
  hard_skills: "Hard Skills",
  responsibilities: "Responsibilities",
  domain_relevance: "Domain Relevance",
  seniority: "Seniority Match",
  nice_to_haves: "Nice-to-Haves",
  education_certs: "Education & Certs",
  recent_achievements: "Recent Achievements",
  constraints: "Constraints",
};

function prettyLabel(dim) {
  return DIM_LABELS[dim] || dim.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Collapsible subscore row with evidence ───────── */
function SubscoreRow({ sub }) {
  const [open, setOpen] = useState(false);
  const evidence = sub.evidence?.filter((e) => e && e !== "No evidence found.") || [];
  return (
    <div className="border border-slate-100 rounded-xl p-3">
      <div className="cursor-pointer" onClick={() => evidence.length && setOpen(!open)}>
        <ScoreBar label={prettyLabel(sub.dimension)} score={sub.score} maxScore={sub.max_score} />
      </div>
      {evidence.length > 0 && (
        <button onClick={() => setOpen(!open)} className="text-xs text-brand-600 mt-1.5 hover:underline">
          {open ? "Hide evidence ▲" : `Show evidence (${evidence.length}) ▼`}
        </button>
      )}
      {open && (
        <ul className="mt-2 space-y-1 pl-3 border-l-2 border-brand-200">
          {evidence.map((e, i) => (
            <li key={i} className="text-xs text-slate-600 italic">"{e}"</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────── */
export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef();
  const navigate = useNavigate();

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const data = await resume.upload(file, jdText || null);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setJdText("");
    setResult(null);
    setError("");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upload & Evaluate Resume</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload your resume for instant AI analysis. Add a job description for JD match & fit index.
        </p>
      </div>

      {!result && (
        <>
          {/* ── Drop zone ──────────────────────────────────────── */}
          <div
            className={`card border-2 border-dashed transition-colors cursor-pointer text-center py-14 ${
              dragActive ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.rtf,.html,.htm,.odt,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="text-5xl mb-3">{file ? "📎" : "📁"}</div>
            {file ? (
              <p className="font-medium text-slate-700">{file.name}</p>
            ) : (
              <>
                <p className="font-medium text-slate-600">Drag & drop your resume here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse · PDF, DOCX, TXT, images</p>
              </>
            )}
          </div>

          {/* ── Optional JD ────────────────────────────────────── */}
          <div className="card space-y-2">
            <label className="label">Job Description (optional)</label>
            <textarea
              className="input min-h-[120px] resize-y"
              placeholder="Paste a job description here for JD match analysis, fit index, tailored resume, and cover letter…"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-200">
              {error}
            </div>
          )}

          <button onClick={handleUpload} disabled={!file || loading} className="btn-primary w-full">
            {loading ? "Uploading & Evaluating…" : "Upload & Evaluate"}
          </button>

          {loading && <LoadingSpinner text="Running AI evaluation — this may take 15-30 seconds…" />}
        </>
      )}

      {/* ── Results ────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="card flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600">
              <span className="text-xl">✅</span>
              <span className="font-semibold">Resume analyzed successfully!</span>
            </div>
            <span className="text-sm text-slate-400">{result.filename}</span>
          </div>

          {/* ── Fit Index (only when JD provided) ──────────────── */}
          {result.fit_index != null && (
            <section className="card text-center">
              <h2 className="font-semibold text-lg text-slate-800 mb-2">🏆 Fit Index</h2>
              <div className={`text-5xl font-extrabold ${result.fit_index >= 70 ? "text-emerald-600" : result.fit_index >= 40 ? "text-amber-500" : "text-rose-500"}`}>
                {result.fit_index}
              </div>
              <p className="text-xs text-slate-400 mt-1">0.6 × JD Match + 0.4 × CV Quality</p>
            </section>
          )}

          {/* ── Extracted Skills ───────────────────────────────── */}
          {result.structured_data?.skills?.length > 0 && (
            <section className="card">
              <h2 className="font-semibold text-lg text-slate-800 mb-3">🛠️ Extracted Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {result.structured_data.skills.map((s, i) => (
                  <span key={i} className="bg-brand-50 text-brand-700 text-xs px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
              {result.structured_data.seniority_estimate && (
                <p className="text-sm text-slate-500 mt-3">
                  Seniority: <span className="capitalize font-medium text-slate-700">{result.structured_data.seniority_estimate}</span>
                </p>
              )}
            </section>
          )}

          {/* ── CV Quality (always shown) ──────────────────────── */}
          {result.cv_quality && (
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-slate-800">📊 CV Quality</h2>
                <span className="text-2xl font-bold text-slate-800">
                  {result.cv_quality.overall_score}<span className="text-sm font-normal text-slate-400">/100</span>
                </span>
              </div>
              <div className="space-y-2">
                {(result.cv_quality.subscores || []).map((sub) => (
                  <SubscoreRow key={sub.dimension} sub={sub} />
                ))}
              </div>
            </section>
          )}

          {/* ── JD Match (only when JD provided) ───────────────── */}
          {result.jd_match && (
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-slate-800">🎯 JD Match</h2>
                <span className="text-2xl font-bold text-slate-800">
                  {result.jd_match.overall_score}<span className="text-sm font-normal text-slate-400">/100</span>
                </span>
              </div>
              <div className="space-y-2">
                {(result.jd_match.subscores || []).map((sub) => (
                  <SubscoreRow key={sub.dimension} sub={sub} />
                ))}
              </div>
            </section>
          )}

          {/* ── Key Takeaways ──────────────────────────────────── */}
          {result.key_takeaways && (
            <section className="card">
              <h2 className="font-semibold text-lg text-slate-800 mb-4">🔑 Key Takeaways</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Red flags */}
                {result.key_takeaways.red_flags?.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <h3 className="font-semibold text-red-700 text-sm mb-2">🚩 Red Flags</h3>
                    <ul className="space-y-1.5">
                      {result.key_takeaways.red_flags.map((f, i) => (
                        <li key={i} className="text-sm text-red-600 flex gap-2">
                          <span>•</span><span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Green flags */}
                {result.key_takeaways.green_flags?.length > 0 && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <h3 className="font-semibold text-emerald-700 text-sm mb-2">✅ Green Flags</h3>
                    <ul className="space-y-1.5">
                      {result.key_takeaways.green_flags.map((f, i) => (
                        <li key={i} className="text-sm text-emerald-600 flex gap-2">
                          <span>•</span><span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Enhancement (only when JD provided) ────────────── */}
          {result.enhancement && (
            <>
              {/* Tailored Resume */}
              {result.enhancement.tailored_resume && (
                <section className="card">
                  <h2 className="font-semibold text-lg text-slate-800 mb-4">📝 Tailored Resume</h2>
                  {result.enhancement.tailored_resume.summary && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">Summary</h3>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                        {result.enhancement.tailored_resume.summary}
                      </p>
                    </div>
                  )}
                  {result.enhancement.tailored_resume.experience?.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">Experience</h3>
                      <ul className="space-y-1.5 text-sm text-slate-600">
                        {result.enhancement.tailored_resume.experience.map((e, i) => (
                          <li key={i} className="flex gap-2"><span className="text-brand-500">•</span>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.enhancement.tailored_resume.skills?.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {result.enhancement.tailored_resume.skills.map((s, i) => (
                          <span key={i} className="bg-brand-50 text-brand-700 text-xs px-2.5 py-1 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.enhancement.tailored_resume.projects?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">Projects</h3>
                      <ul className="space-y-1.5 text-sm text-slate-600">
                        {result.enhancement.tailored_resume.projects.map((p, i) => (
                          <li key={i} className="flex gap-2"><span className="text-brand-500">•</span>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* Top 1% Gap Analysis */}
              {result.enhancement.top_1_percent_gap && (
                <section className="card">
                  <h2 className="font-semibold text-lg text-slate-800 mb-4">🎯 Top 1% Gap Analysis</h2>
                  <div className="space-y-4">
                    {result.enhancement.top_1_percent_gap.strengths?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-700 mb-1">💪 Strengths</h3>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {result.enhancement.top_1_percent_gap.strengths.map((s, i) => (
                            <li key={i} className="flex gap-2"><span className="text-emerald-500">•</span>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.enhancement.top_1_percent_gap.gaps?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-amber-700 mb-1">⚠️ Gaps</h3>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {result.enhancement.top_1_percent_gap.gaps.map((g, i) => (
                            <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.enhancement.top_1_percent_gap.actionable_next_steps?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-brand-700 mb-1">🚀 Actionable Next Steps</h3>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {result.enhancement.top_1_percent_gap.actionable_next_steps.map((s, i) => (
                            <li key={i} className="flex gap-2"><span className="text-brand-500">{i + 1}.</span>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Cover Letter */}
              {result.enhancement.cover_letter && (
                <section className="card">
                  <h2 className="font-semibold text-lg text-slate-800 mb-3">✉️ Cover Letter</h2>
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                    {result.enhancement.cover_letter}
                  </pre>
                </section>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => navigate("/interview/setup", { state: { resumeId: result.resume_id } })} className="btn-primary text-sm">
              🎤 Start Interview
            </button>
            <button onClick={handleReset} className="btn-secondary text-sm">
              Upload Another Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
