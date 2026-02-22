import { useState, useRef, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { interview } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";

/* ── Stage metadata ─────────────────────────────────── */
const STAGE_META = {
  intro: { icon: "👋", label: "Introduction", color: "bg-blue-100 text-blue-700", order: 1 },
  technical: { icon: "💻", label: "Technical", color: "bg-indigo-100 text-indigo-700", order: 2 },
  deep_dive: { icon: "🔬", label: "Deep Dive", color: "bg-purple-100 text-purple-700", order: 3 },
  behavioral: { icon: "🧠", label: "Behavioral", color: "bg-amber-100 text-amber-700", order: 4 },
  closing: { icon: "🤝", label: "Closing", color: "bg-emerald-100 text-emerald-700", order: 5 },
  final_evaluation: { icon: "📊", label: "Evaluating", color: "bg-rose-100 text-rose-700", order: 6 },
  completed: { icon: "✅", label: "Complete", color: "bg-emerald-100 text-emerald-700", order: 7 },
};
const TOTAL_STAGES = 5;

export default function Interview() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => {
    const q = location.state?.firstQuestion;
    return q ? [{ role: "interviewer", content: q }] : [];
  });
  const [stage, setStage] = useState(location.state?.stage || "intro");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(!location.state?.firstQuestion);
  const [sending, setSending] = useState(false);
  const [complete, setComplete] = useState(false);
  const bottomRef = useRef(null);

  const meta = STAGE_META[stage] || STAGE_META.intro;
  const questionCount = messages.filter((m) => m.role === "interviewer").length;
  const answerCount = messages.filter((m) => m.role === "user").length;
  const stageProgress = Math.min(((meta.order || 1) / TOTAL_STAGES) * 100, 100);

  // Extra context from setup
  const setupCtx = location.state || {};

  // Fetch session if no initial question passed via state
  useEffect(() => {
    if (messages.length > 0) return;
    interview
      .getSession(sessionId)
      .then((s) => {
        const hist = (s.history || []).map((h) => ({
          role: h.role === "interviewer" ? "interviewer" : "user",
          content: h.content,
        }));
        setMessages(hist.length ? hist : [{ role: "interviewer", content: "Hi! Let's get started." }]);
        setStage(s.stage);
        setComplete(s.is_complete);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const res = await interview.submitAnswer(sessionId, text);
      setStage(res.stage);

      if (res.is_complete) {
        setComplete(true);
        setMessages((prev) => [
          ...prev,
          { role: "interviewer", content: "Thank you for the interview! Let me prepare your evaluation report…" },
        ]);
      } else if (res.question) {
        setMessages((prev) => [...prev, { role: "interviewer", content: res.question }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Error: ${err.message}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleViewReport() {
    navigate(`/report/${sessionId}`);
  }

  if (loading) return <LoadingSpinner text="Loading interview session…" />;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{meta.icon}</div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">AI Interview</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                  {meta.label}
                </span>
                {setupCtx.role && (
                  <span className="text-[10px] text-slate-400">for {setupCtx.role}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Questions</div>
              <div className="text-sm font-bold text-slate-700">{questionCount}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Answers</div>
              <div className="text-sm font-bold text-slate-700">{answerCount}</div>
            </div>
            {complete && (
              <button onClick={handleViewReport} className="btn-primary text-xs py-1.5 px-3">
                View Report →
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Progress</span>
            <span>{complete ? "Complete" : meta.label}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${complete ? "bg-emerald-500" : "bg-brand-500"}`}
              style={{ width: `${complete ? 100 : stageProgress}%` }}
            />
          </div>
          <div className="flex justify-between">
            {["Intro", "Technical", "Deep Dive", "Behavioral", "Closing"].map((s, i) => (
              <span
                key={s}
                className={`text-[9px] font-medium ${
                  (meta.order || 1) > i + 1
                    ? "text-brand-600"
                    : (meta.order || 1) === i + 1
                    ? "text-brand-500 font-bold"
                    : "text-slate-300"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-600 text-white rounded-br-md"
                  : m.role === "system"
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm"
              }`}
            >
              {m.role === "interviewer" && (
                <span className="text-xs font-medium text-brand-600 block mb-1">🎯 Interviewer</span>
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <span className="text-xs font-medium text-brand-600 block mb-1">🎯 Interviewer</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      {!complete ? (
        <form onSubmit={handleSend} className="flex gap-3 pt-3 border-t border-slate-200">
          <input
            type="text"
            className="input flex-1"
            placeholder="Type your answer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            autoFocus
          />
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-6">
            Send
          </button>
        </form>
      ) : (
        <div className="text-center py-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <span className="text-xl">✅</span>
            <span className="font-semibold text-sm">Interview complete!</span>
          </div>
          <button onClick={handleViewReport} className="btn-primary">
            📊 View Final Report
          </button>
        </div>
      )}
    </div>
  );
}
