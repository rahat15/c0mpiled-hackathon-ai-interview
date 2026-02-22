import { useState } from "react";
import { Link } from "react-router-dom";
import { JOBS } from "../data/jobs";

const ALL_TAGS = [...new Set(JOBS.flatMap((j) => j.tags))];

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  const filtered = JOBS.filter((job) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.tags.some((t) => t.toLowerCase().includes(q));
    const matchesTag = !selectedTag || job.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Browse Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Find your next role and prepare with AI-powered tools
        </p>
      </div>

      {/* ── Search & Filters ────────────────────────────────── */}
      <div className="card !p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            className="input pl-10"
            placeholder="Search by title, company, or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
        >
          <option value="">All Skills</option>
          {ALL_TAGS.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {/* ── Job Cards ───────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-600 font-medium">No jobs match your search</p>
            <p className="text-sm text-slate-400 mt-1">Try different keywords or clear filters</p>
          </div>
        ) : (
          filtered.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="card !p-5 flex items-start gap-4 group hover:shadow-md hover:border-brand-200 transition-all duration-200"
            >
              {/* Logo */}
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                {job.logo}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {job.company} · {job.location}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{job.posted}</span>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {job.salary}
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {job.type}
                  </span>
                  {job.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {job.tags.length > 3 && (
                    <span className="text-xs text-slate-400">+{job.tags.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <span className="text-slate-300 group-hover:text-brand-500 transition-colors text-lg mt-2">→</span>
            </Link>
          ))
        )}
      </div>

      <p className="text-center text-xs text-slate-400 pt-2">
        Showing {filtered.length} of {JOBS.length} positions
      </p>
    </div>
  );
}
