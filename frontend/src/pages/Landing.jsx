import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: "📋",
    title: "Smart Job Matching",
    desc: "Browse curated job listings and instantly see how your resume stacks up against each role's requirements.",
  },
  {
    icon: "📊",
    title: "AI Resume Evaluation",
    desc: "Get rubric-based scoring across 8 quality dimensions with evidence quotes, gap analysis, and actionable improvements.",
  },
  {
    icon: "🎤",
    title: "Mock Interviews",
    desc: "Practice with AI interviewers tailored to the exact job description — friendly, strict, or startup CTO style.",
  },
  {
    icon: "✉️",
    title: "Cover Letter & Tailoring",
    desc: "Receive a tailored resume and cover letter optimized for each specific role you're targeting.",
  },
];

const STEPS = [
  { num: "01", title: "Browse Jobs", desc: "Explore open positions across top companies and industries." },
  { num: "02", title: "Evaluate Your Resume", desc: "Upload your CV and get instant AI scoring against the job description." },
  { num: "03", title: "Practice Interview", desc: "Run a mock interview with an AI interviewer tailored to the role." },
  { num: "04", title: "Get Your Report", desc: "Receive a detailed performance report with strengths, gaps, and next steps." },
];

const STATS = [
  { value: "8+", label: "Scoring Dimensions" },
  { value: "3", label: "Interviewer Styles" },
  { value: "100%", label: "AI-Powered" },
  { value: "∞", label: "Practice Sessions" },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top Nav ─────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-800">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white text-sm font-black">
              AI
            </div>
            InterviewAI
          </Link>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-5 rounded-xl transition-colors text-sm">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-brand-600 font-medium text-sm transition-colors px-4 py-2">
                  Sign In
                </Link>
                <Link to="/register" className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-5 rounded-xl transition-colors text-sm">
                  Get Started Free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
            AI-Powered Career Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Ace Your Next Interview
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
              With AI Precision
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Upload your resume, match it against real job descriptions, get detailed rubric-based scoring,
            and practice with AI mock interviews — all in one seamless workflow.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link
              to={isAuthenticated ? "/jobs" : "/register"}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-8 rounded-2xl transition-all text-base shadow-lg shadow-brand-200 hover:shadow-brand-300 hover:-translate-y-0.5"
            >
              Start for Free →
            </Link>
            <a
              href="#how-it-works"
              className="text-slate-600 hover:text-brand-600 font-medium py-3.5 px-8 rounded-2xl border border-slate-200 hover:border-brand-200 transition-all text-base"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-5xl mx-auto py-10 px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-brand-600">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">Everything You Need to Land the Job</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              From resume analysis to mock interviews, our platform covers every step of your job preparation journey.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-brand-200 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{f.title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
            <p className="text-slate-500 mt-3">Four simple steps to interview-ready confidence.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-slate-200" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-brand-200 flex items-center justify-center mx-auto mb-4 relative z-10">
                  <span className="text-brand-600 font-extrabold text-lg">{s.num}</span>
                </div>
                <h3 className="font-semibold text-slate-800">{s.title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute -left-8 -bottom-12 w-36 h-36 bg-white/5 rounded-full" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-3">Ready to Get Interview-Ready?</h2>
              <p className="text-brand-200 mb-8 max-w-md mx-auto">
                Join thousands of candidates using AI to prepare smarter, not harder.
              </p>
              <Link
                to={isAuthenticated ? "/jobs" : "/register"}
                className="inline-block bg-white text-brand-700 font-semibold py-3.5 px-8 rounded-2xl hover:bg-brand-50 transition-colors shadow-lg"
              >
                Get Started — It's Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <div className="max-w-6xl mx-auto px-6">
          InterviewAI — Built for the C0mpiled Hackathon · © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
