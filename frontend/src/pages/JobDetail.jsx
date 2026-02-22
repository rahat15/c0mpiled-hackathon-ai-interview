import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { JOBS } from "../data/jobs";
import { resume, interview } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBar from "../components/ScoreBar";

/* ── helpers ──────────────────────────────────────────── */
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

/* ── Subscore row with evidence ───────────────────────── */
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

/* ── Workflow steps enum ──────────────────────────────── */
const STEP = { VIEW: 0, EVALUATE: 1, RESULTS: 2, INTERVIEW_SETUP: 3 };

/* ── Main component ──────────────────────────────────── */
export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef();

  const job = JOBS.find((j) => j.id === jobId);

  // Upload & eval state
  const [step, setStep] = useState(STEP.VIEW);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Interview state
  const [personality, setPersonality] = useState("friendly");
  const [startingInterview, setStartingInterview] = useState(false);

  if (!job) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-slate-700">Job not found</h2>
        <Link to="/jobs" className="btn-primary inline-block mt-4 text-sm">← Back to Jobs</Link>
      </div>
    );
  }

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

  async function handleEvaluate() {
    if (!file) return;
    setError("");
    setLoading(true);
    setStep(STEP.EVALUATE);
    try {
      const data = await resume.upload(file, job.description);
      setResult(data);
      setStep(STEP.RESULTS);
    } catch (err) {
      setError(err.message);
      setStep(STEP.VIEW);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartInterview() {
    if (!result?.resume_id) return;
    setStartingInterview(true);
    setError("");
    try {
      const data = await interview.createSession(result.resume_id, job.description, personality);
      navigate(`/interview/${data.session_id}`, {
        state: {
          firstQuestion: data.question,
          stage: data.stage,
          role: job.title,
          company: job.company,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setStartingInterview(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/jobs" className="hover:text-brand-600 transition-colors">Jobs</Link>
        <span>→</span>
        <span className="text-slate-600">{job.title}</span>
      </div>

      {/* ── Job Header ─────────────────────────────────────── */}
      <div className="card !p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-3xl shrink-0">
            {job.logo}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">{job.title}</h1>
            <p className="text-slate-500 mt-1">{job.company} · {job.location}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {job.salary}
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{job.type}</span>
              {job.tags.map((tag) => (
                <span key={tag} className="text-xs text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left: Job Description ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="font-semibold text-lg text-slate-800 mb-4">📋 Job Description</h2>
            <div className="prose prose-sm prose-slate max-w-none">
              {job.description.split("\n\n").map((para, i) => (
                <div key={i} className="mb-4">
                  {para.split("\n").map((line, j) => {
                    if (line.startsWith("•")) {
                      return <p key={j} className="text-sm text-slate-600 pl-4 py-0.5">{line}</p>;
                    }
                    if (line.endsWith(":")) {
                      return <h3 key={j} className="font-semibold text-slate-700 text-sm mt-3 mb-1">{line}</h3>;
                    }
                    return <p key={j} className="text-sm text-slate-600 leading-relaxed">{line}</p>;
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── CV Evaluation Results ───────────────────────── */}
          {step === STEP.RESULTS && result && (
            <div className="space-y-4">
              {/* Fit Index */}
              {result.fit_index != null && (
                <div className="card text-center">
                  <h2 className="font-semibold text-lg text-slate-800 mb-2">🏆 Fit Index</h2>
                  <div className={`text-5xl font-extrabold ${result.fit_index >= 70 ? "text-emerald-600" : result.fit_index >= 40 ? "text-amber-500" : "text-rose-500"}`}>
                    {result.fit_index}
                    <span className="text-lg font-normal text-slate-400"> / 100</span>
                  </div>
                </div>
              )}

              {/* CV Quality */}
              {result.cv_quality && (
                <div className="card">
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
                </div>
              )}

              {/* JD Match */}
              {result.jd_match && (
                <div className="card">
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
                </div>
              )}

              {/* Key Takeaways */}
              {result.key_takeaways && (
                <div className="card">
                  <h2 className="font-semibold text-lg text-slate-800 mb-4">🔑 Key Takeaways</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.key_takeaways.red_flags?.length > 0 && (
                      <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                        <h3 className="font-semibold text-red-700 text-sm mb-2">🚩 Red Flags</h3>
                        <ul className="space-y-1.5">
                          {result.key_takeaways.red_flags.map((f, i) => (
                            <li key={i} className="text-sm text-red-600 flex gap-2"><span>•</span><span>{f}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.key_takeaways.green_flags?.length > 0 && (
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <h3 className="font-semibold text-emerald-700 text-sm mb-2">✅ Green Flags</h3>
                        <ul className="space-y-1.5">
                          {result.key_takeaways.green_flags.map((f, i) => (
                            <li key={i} className="text-sm text-emerald-600 flex gap-2"><span>•</span><span>{f}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Action Panel ──────────────────────────── */}
        <div className="space-y-4">
          {/* Workflow Stepper */}
          <div className="card !p-4">
            <h3 className="font-semibold text-sm text-slate-700 mb-3">🚀 Your Workflow</h3>
            <div className="space-y-2">
              {[
                { label: "View Job Details", done: true },
                { label: "Evaluate Resume", done: step >= STEP.RESULTS },
                { label: "Practice Interview", done: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    s.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {s.done ? "✓" : i + 1}
                  </div>
                  <span className={s.done ? "text-slate-700 font-medium" : "text-slate-400"}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step: Upload & Evaluate */}
          {step < STEP.RESULTS && (
            <div className="card space-y-4">
              <h3 className="font-semibold text-sm text-slate-700">📄 Evaluate Your Resume</h3>
              <p className="text-xs text-slate-500">
                Upload your resume to see how it matches this role. The AI will score it against the job description automatically.
              </p>

              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div>
                    <div className="text-2xl mb-1">📎</div>
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl mb-1">📁</div>
                    <p className="text-xs text-slate-600 font-medium">Drop resume or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOCX, TXT</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 border border-red-200">{error}</div>
              )}

              <button
                onClick={handleEvaluate}
                disabled={!file || loading}
                className="btn-primary w-full text-sm"
              >
                {loading ? "Analyzing…" : "Evaluate Against This Job"}
              </button>

              {loading && <LoadingSpinner text="AI is evaluating your resume — 15-30 seconds…" />}
            </div>
          )}

          {/* Step: Results → Interview */}
          {step === STEP.RESULTS && result && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="text-lg">✅</span>
                <span className="font-semibold text-sm">Resume evaluated!</span>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">🎤 Practice Interview</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Ready to practice? Start a mock interview tailored to this exact role and job description.
                </p>

                <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-slate-600">Interviewer Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "friendly", icon: "😊", label: "Friendly" },
                      { value: "strict", icon: "🧐", label: "Strict" },
                      { value: "startup_cto", icon: "🚀", label: "CTO" },
                    ].map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPersonality(p.value)}
                        className={`text-center py-2 px-1 rounded-lg border-2 text-xs transition-all ${
                          personality === p.value
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-lg">{p.icon}</div>
                        <div className="font-medium mt-0.5">{p.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 border border-red-200 mb-3">{error}</div>
                )}

                <button
                  onClick={handleStartInterview}
                  disabled={startingInterview}
                  className="btn-primary w-full text-sm"
                >
                  {startingInterview ? "Starting…" : "🎤 Start Mock Interview"}
                </button>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <button
                  onClick={() => { setStep(STEP.VIEW); setFile(null); setResult(null); setError(""); }}
                  className="text-xs text-slate-500 hover:text-brand-600 transition-colors"
                >
                  ↻ Evaluate a different resume
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
