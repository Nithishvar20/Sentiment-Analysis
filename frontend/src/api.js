// src/api.js
// Centralized API helpers used by the frontend

// Base for backend API. Adjust if your backend runs on a different host/port.
export const API_BASE = (function () {
  // Hardcode if you want: const explicit = "http://localhost:8000";
  const explicit = "";
  if (explicit) return explicit;
  const host = window.location.hostname || "localhost";
  return `${window.location.protocol}//${host}:8000`; // backend runs on 8000
})();

async function toJsonSafe(resp) {
  const text = await resp.text();
  try {
    return JSON.parse(text || "{}");
  } catch (e) {
    return { _raw: text };
  }
}

// -------------------------------
// Upload one CSV and get analysis
// -------------------------------
export async function postAnalyzeCsv(file) {
  const url = `${API_BASE}/api/upload_csv`;
  const form = new FormData();
  form.append("file", file, file.name);

  const resp = await fetch(url, { method: "POST", body: form });

  if (!resp.ok) {
    const err = await toJsonSafe(resp);
    const msg =
      err.detail ||
      err.error ||
      err._raw ||
      resp.statusText ||
      `HTTP ${resp.status}`;
    throw new Error(msg);
  }

  return toJsonSafe(resp);
}

// -------------------------------
// Upload multiple CSVs in one go
// -------------------------------
export async function postAnalyzeMultiple(files) {
  // Merge files client-side before sending, OR send sequentially
  const allResults = [];
  for (const file of files) {
    try {
      const res = await postAnalyzeCsv(file);
      if (res?.rows) {
        allResults.push(...res.rows);
      }
    } catch (err) {
      console.error("Failed for", file.name, err);
    }
  }
  return { rows: allResults };
}

// -------------------------------
// Trend APIs (optional, backend may not always expose these)
// -------------------------------
export async function getSentimentTrend() {
  const url = `${API_BASE}/api/sentiment_trend_chart`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  return toJsonSafe(resp);
}

export async function getTrendSummary() {
  const url = `${API_BASE}/api/trend_summary`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  return toJsonSafe(resp);
}

// -------------------------------
// Wordcloud helper (frontend uses in button)
// -------------------------------
export function wordCloudUrl(limit = 100) {
  return `${API_BASE}/api/wordcloud.svg?limit_words=${limit}`;
}