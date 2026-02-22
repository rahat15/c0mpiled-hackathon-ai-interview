import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { interview, resume } from "../api/client";

/* ── Config ──────────────────────────────────────────── */

const ROUND_TYPES = [
  {
    value: "full",
    icon: "🎯",
    label: "Full Interview",
    desc: "All rounds: intro → technical → deep-dive → behavioral → closing",
  },
  {
    value: "technical",
    icon: "💻",
    label: "Technical",
    desc: "Focus on coding, system design, and technical problem-solving",
  },
  {
    value: "behavioral",
    icon: "🧠",
    label: "Behavioral",
    desc: "STAR-method situational questions and culture fit assessment",
  },
  {
    value: "problem_solving",
    icon: "🧩",
    label: "Problem Solving",
    desc: "Logic puzzles, estimation, and analytical thinking challenges",
  },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy", icon: "🟢", desc: "Entry-level / new grad" },
  { value: "medium", label: "Medium", icon: "🟡", desc: "Mid-level / 2-4 years" },
  { value: "hard", label: "Hard", icon: "🔴", desc: "Senior / 5+ years" },
];

const PERSONALITIES = [
  { value: "friendly", icon: "😊", label: "Friendly", desc: "Warm and encouraging, great for practice" },
  { value: "strict", icon: "🧐", label: "Strict", desc: "Direct and rigorous, challenges your depth" },
  { value: "startup_cto", icon: "🚀", label: "Startup CTO", desc: "Fast-paced, pragmatic, real-world focus" },
];

const EXPERIENCE_LEVELS = [
  "Fresh Graduate",
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5-8 years",
  "8+ years",
];

/* ── Selection card ──────────────────────────────────── */

function SelectCard({ selected, onClick, icon, label, desc, small }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 text-left transition-all duration-200 ${
        small ? "p-2.5" : "p-3"
      } ${
        selected
          ? "border-brand-500 bg-brand-50 shadow-sm shadow-brand-100"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className={`font-medium ${small ? "text-xs" : "text-sm"} flex items-center gap-1.5`}>
        <span>{icon}</span> {label}
      </div>
      {desc && <div className={`text-slate-500 mt-0.5 ${small ? "text-[10px]" : "text-xs"}`}>{desc}</div>}
    </button>
  );
}

/* ── Section header ──────────────────────────────────── */

function Section({ number, title, subtitle, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
          {number}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Main component ──────────────────────────────────── */

export default function InterviewSetup() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [resumeId, setResumeId] = useState(location.state?.resumeId || "");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(!!location.state?.resumeId);
  const [roundType, setRoundType] = useState("full");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [experience, setExperience] = useState("");
  const [jdText, setJdText] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [personality, setPersonality] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function buildContextString() {
    const parts = [];
    if (role) parts.push(`Target Role: ${role}`);
    if (company) parts.push(`Company: ${company}`);
    if (experience) parts.push(`Experience Level: ${experience}`);
    if (difficulty !== "medium") parts.push(`Difficulty: ${difficulty}`);
    if (roundType !== "full") parts.push(`Interview Focus: ${roundType.replace("_", " ")}`);
    if (jdText.trim()) {
      parts.push(`\n--- Job Description ---\n${jdText.trim()}`);
    }
    return parts.join("\n");
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setResumeName(file.name);
    setUploadDone(false);
    setUploading(true);
    setError("");
    try {
      const result = await resume.upload(file);
      setResumeId(result.resume_id);
      setUploadDone(true);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
      setResumeFile(null);
      setResumeName("");
    } finally {
      setUploading(false);
    }
  }

  async function handleStart(e) {
    e.preventDefault();
    if (!resumeId) {
      setError("Please upload your resume first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const contextStr = buildContextString();
      const data = await interview.createSession(resumeId, contextStr, personality);
      navigate(`/interview/${data.session_id}`, {
        state: {
          firstQuestion: data.question,
          stage: data.stage,
          roundType,
          role,
          company,
          difficulty,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Page header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🎤 Interview Setup</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure your AI mock interview session. All fields help tailor the experience.
        </p>
      </div>

      <form onSubmit={handleStart} className="space-y-6">
        {/* ── Section 1: Interview Type ──────────────────── */}
        <div className="card space-y-4">
          <Section number="1" title="Interview Type" subtitle="Choose the focus of your interview">
            <div className="grid sm:grid-cols-2 gap-3">
              {ROUND_TYPES.map((r) => (
                <SelectCard
                  key={r.value}
                  selected={roundType === r.value}
                  onClick={() => setRoundType(r.value)}
                  icon={r.icon}
                  label={r.label}
                  desc={r.desc}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* ── Section 2: Job Context ─────────────────────── */}
        <div className="card space-y-4">
          <Section number="2" title="Job Context" subtitle="Help the AI tailor questions to your target role">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Target Role</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Senior Frontend Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Company (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Google, Stripe, Startup"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Experience Level</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setExperience(experience === lvl ? "" : lvl)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      experience === lvl
                        ? "border-brand-500 bg-brand-50 text-brand-700 font-medium"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Job Description (optional)</label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="Paste the target job description for tailored questions…"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            </div>
          </Section>
        </div>

        {/* ── Section 3: Difficulty & Style ───────────────── */}
        <div className="card space-y-5">
          <Section number="3" title="Difficulty Level" subtitle="Controls the depth and complexity of questions">
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map((d) => (
                <SelectCard
                  key={d.value}
                  selected={difficulty === d.value}
                  onClick={() => setDifficulty(d.value)}
                  icon={d.icon}
                  label={d.label}
                  desc={d.desc}
                  small
                />
              ))}
            </div>
          </Section>

          <div className="border-t border-slate-100 pt-5">
            <Section number="4" title="Interviewer Style" subtitle="Each personality asks questions differently">
              <div className="grid sm:grid-cols-3 gap-3">
                {PERSONALITIES.map((p) => (
                  <SelectCard
                    key={p.value}
                    selected={personality === p.value}
                    onClick={() => setPersonality(p.value)}
                    icon={p.icon}
                    label={p.label}
                    desc={p.desc}
                    small
                  />
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* ── Section 5: Resume Upload ────────────────────── */}
        <div className="card space-y-3">
          <Section number="5" title="Upload Resume" subtitle="Upload your CV/resume (PDF or DOCX)">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!uploadDone ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  uploading
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-300 hover:border-brand-400 hover:bg-brand-50/50"
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-brand-600 font-medium">Uploading {resumeName}…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📄</span>
                    <p className="text-sm font-medium text-slate-600">Click to upload resume</p>
                    <p className="text-xs text-slate-400">PDF, DOC, or DOCX • Max 10MB</p>
                  </div>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <span className="text-xl">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-800 truncate">{resumeName}</p>
                  <p className="text-xs text-emerald-600">Uploaded successfully</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResumeId("");
                    setResumeFile(null);
                    setResumeName("");
                    setUploadDone(false);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 underline"
                >
                  Replace
                </button>
              </div>
            )}
          </Section>
        </div>

        {/* ── Error ──────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-200">
            {error}
          </div>
        )}

        {/* ── Summary & Start ────────────────────────────── */}
        <div className="card bg-slate-50 border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">📋 Session Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-400 block">Type</span>
              <span className="font-medium text-slate-700 capitalize">{roundType.replace("_", " ")}</span>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-400 block">Difficulty</span>
              <span className="font-medium text-slate-700 capitalize">{difficulty}</span>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-400 block">Style</span>
              <span className="font-medium text-slate-700 capitalize">{personality.replace("_", " ")}</span>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-400 block">Role</span>
              <span className="font-medium text-slate-700 truncate block">{role || "—"}</span>
            </div>
          </div>
          {resumeName && (
            <div className="mt-3 bg-white rounded-lg p-2.5 border border-slate-200 text-xs">
              <span className="text-slate-400">Resume:</span>{" "}
              <span className="font-medium text-slate-700">{resumeName}</span>
              {uploadDone && <span className="text-emerald-500 ml-1">✓</span>}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading || !uploadDone} className="btn-primary w-full text-base py-3 disabled:opacity-50">
          {loading ? "Starting Interview…" : "🎤 Start Interview"}
        </button>
      </form>
    </div>
  );
}
