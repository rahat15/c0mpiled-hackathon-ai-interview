import { useState, useRef, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { interview } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">AI Interview</h1>
          <p className="text-xs text-slate-400">
            Stage: <span className="capitalize font-medium text-slate-600">{stage?.replace("_", " ")}</span>
          </p>
        </div>
        {complete && (
          <button onClick={handleViewReport} className="btn-primary text-sm">
            View Report →
          </button>
        )}
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
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary">
            Send
          </button>
        </form>
      ) : (
        <div className="text-center py-4 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-3">Interview complete!</p>
          <button onClick={handleViewReport} className="btn-primary">
            📊 View Final Report
          </button>
        </div>
      )}
    </div>
  );
}
