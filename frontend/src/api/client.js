/**
 * API service layer — single source of truth for all backend calls.
 * Handles token injection, 401 redirects, and error normalisation.
 */

const BASE = import.meta.env.VITE_API_URL || "";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      ...authHeaders(),
      ...opts.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }

  return res.json();
}

function json(url, body) {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formData(url, data) {
  return request(url, { method: "POST", body: data });
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  register: (email, password) => json("/api/auth/register", { email, password }),
  login: (email, password) => json("/api/auth/login", { email, password }),
};

// ── Resume ──────────────────────────────────────────────────────────────────
export const resume = {
  upload: (file, jdText) => {
    const fd = new FormData();
    fd.append("file", file);
    if (jdText) fd.append("jd_text", jdText);
    return formData("/api/resume/upload", fd);
  },
};

// ── Interview ───────────────────────────────────────────────────────────────
export const interview = {
  createSession: (resumeId, jdText = "", personality = "friendly") =>
    json("/api/interview/session", {
      resume_id: resumeId,
      jd_text: jdText,
      personality,
    }),

  submitAnswer: (sessionId, answer) =>
    json(`/api/interview/session/${sessionId}/answer`, { answer }),

  complete: (sessionId) =>
    request(`/api/interview/session/${sessionId}/complete`, { method: "POST" }),

  getSession: (sessionId) =>
    request(`/api/interview/session/${sessionId}`),

  getReport: (sessionId) =>
    request(`/api/interview/session/${sessionId}/report`),

  listSessions: () => request("/api/interview/sessions"),
};
