import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { interview } from "../api/client";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

/* ── Stat card ─────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = "brand" }) {
  const bg = {
    brand: "from-brand-500 to-brand-700",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-amber-700",
    rose: "from-rose-500 to-rose-700",
  }[color];
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center text-white text-xl shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Feature card ──────────────────────────────────────── */
function FeatureCard({ icon, title, desc, to, tag }) {
  return (
    <Link to={to} className="card group hover:shadow-lg hover:border-brand-200 transition-all duration-200 relative overflow-hidden">
      {tag && (
        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
          {tag}
        </span>
      )}
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">{icon}</div>
      <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
      <div className="mt-4 text-sm font-medium text-brand-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Get Started <span className="text-lg">→</span>
      </div>
    </Link>
  );
}

/* ── Main Dashboard ────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
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

  const completedSessions = sessions.filter((s) => s.is_complete);
  const activeSessions = sessions.filter((s) => !s.is_complete);

  return (
    <div className="space-y-8">
      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="card bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white border-0 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -right-4 -bottom-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative">
          <p className="text-brand-200 text-sm font-medium">Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋</p>
          <h1 className="text-3xl font-bold mt-1">AI Interview Platform</h1>
          <p className="text-brand-200 mt-2 text-sm max-w-lg leading-relaxed">
            Upload your resume for detailed rubric-based evaluation, get tailored improvement suggestions,
            and practice realistic AI-powered mock interviews.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/resume/upload" className="bg-white text-brand-700 font-semibold py-2.5 px-6 rounded-xl hover:bg-brand-50 transition-colors text-sm shadow-lg shadow-brand-900/20">
              📄 Upload Resume
            </Link>
            <Link to="/interview/setup" className="bg-white/10 backdrop-blur text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-white/20 border border-white/20 transition-colors text-sm">
              🎤 Start Interview
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Overview ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📄" label="Total Interviews" value={sessions.length} color="brand" />
        <StatCard icon="✅" label="Completed" value={completedSessions.length} color="emerald" />
        <StatCard icon="⏳" label="In Progress" value={activeSessions.length} color="amber" />
        <StatCard icon="📊" label="Reports Ready" value={sessions.filter((s) => s.has_report).length} color="rose" />
      </div>

      {/* ── Features Grid ────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4">🚀 Platform Features</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon="📊"
            title="Resume Evaluation"
            desc="Get detailed rubric-based CV scoring with 8 quality dimensions, evidence quotes, and key takeaways."
            to="/resume/upload"
            tag="AI Powered"
          />
          <FeatureCard
            icon="🎯"
            title="JD Match Analysis"
            desc="Compare your resume against a job description with 8 match dimensions, fit index, and gap analysis."
            to="/resume/upload"
          />
          <FeatureCard
            icon="🎤"
            title="Mock Interview"
            desc="Practice with AI interviewers in different styles — friendly, strict, or startup CTO."
            to="/interview/setup"
          />
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="card bg-slate-50 border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-5">📋 How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "1", icon: "📤", title: "Upload", desc: "Upload your resume (PDF, DOCX, TXT)" },
            { step: "2", icon: "🤖", title: "AI Analysis", desc: "8-dimension rubric scoring with evidence" },
            { step: "3", icon: "💡", title: "Improve", desc: "Get tailored resume, gap analysis & cover letter" },
            { step: "4", icon: "🎤", title: "Practice", desc: "Mock interview with AI-generated report" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                {s.step}
              </div>
              <div className="text-2xl mb-2">{s.icon}</div>
              <h3 className="font-semibold text-slate-800 text-sm">{s.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Active Interviews ────────────────────────────────── */}
      {activeSessions.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">⏳ Active Interviews</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeSessions.map((s) => (
              <div key={s.session_id} className="card flex items-center justify-between border-l-4 border-l-amber-400">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-medium text-slate-700 text-sm capitalize">{s.personality}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Stage: <span className="capitalize">{s.stage?.replace("_", " ")}</span> · Questions: {s.question_count}
                  </p>
                </div>
                <Link to={`/interview/${s.session_id}`} className="btn-primary text-xs py-1.5 px-4">
                  Continue →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Interview History ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">📜 Interview History</h2>
          {sessions.length > 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              {sessions.length} total
            </span>
          )}
        </div>
        {loading ? (
          <LoadingSpinner text="Loading interviews…" />
        ) : error ? (
          <div className="card text-red-500 text-sm">{error}</div>
        ) : completedSessions.length === 0 ? (
          <div className="card text-center py-12 bg-slate-50 border-dashed border-2 border-slate-200">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-slate-600 font-medium">No completed interviews yet</p>
            <p className="text-sm text-slate-400 mt-1">Start your first mock interview to see results here</p>
            <Link to="/interview/setup" className="btn-primary inline-block mt-4 text-sm">
              🎤 Start Interview
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {completedSessions.map((s) => (
              <div key={s.session_id} className="card flex items-center justify-between border-l-4 border-l-emerald-400">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-slate-700 text-sm capitalize">{s.personality}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Completed</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Questions: {s.question_count}
                  </p>
                </div>
                {s.has_report && (
                  <Link to={`/report/${s.session_id}`} className="btn-secondary text-xs py-1.5 px-4">
                    📊 Report
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
