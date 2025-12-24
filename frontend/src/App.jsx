// src/App.jsx
import React, { useState, useEffect } from "react";
import UploadPanel from "./components/UploadPanel";
import Landing from "./components/Landing";
import { API_BASE } from "./api";

const DARK = "dark";
const LIGHT = "light";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("ecinsight_theme") || DARK;
    } catch {
      return DARK;
    }
  });

  // summary starts empty so top card is blank until analysis completes
  const [summary, setSummary] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("ecinsight_theme", theme);
    } catch {}
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const openApi = (path) => {
    const url = `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
    window.open(url, "_blank");
  };

  const handleEnter = () => {
    setShowLanding(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // theme palettes
  const darkVars = {
    appBg: "linear-gradient(180deg, #061021 0%, #071123 60%)",
    cardBg: "#071225",
    subtle: "#9aa7b2",
    muted: "#7b8794",
    accent: "#2b6cf6",
    text: "#e6eef6",
  };

  const lightVars = {
    appBg: "linear-gradient(180deg,#f5f7fa 0%, #ffffff 60%)",
    cardBg: "#ffffff",
    subtle: "#4b5563",
    muted: "#6b7280",
    accent: "#2b6cf6",
    text: "#0b1622",
  };

  const v = theme === DARK ? darkVars : lightVars;

  if (showLanding) {
    return <Landing onEnter={handleEnter} theme={theme} />;
  }

  return (
    <div
      style={{
        background: v.appBg,
        color: v.text,
        minHeight: "100vh",
        padding: 28,
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 34 }}>eConsult Insight</h1>
            <p style={{ color: v.subtle, margin: "6px 0 0" }}>
              Sentiment · Summary · Wordcloud
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => window.open("/", "_self")}
              style={{
                background: "transparent",
                color: v.subtle,
                border: "1px solid rgba(0,0,0,0.1)",
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Home
            </button>

            <button
              onClick={() => openApi("/api/wordcloud.svg")}
              style={{
                background: v.accent,
                color: "#fff",
                border: "none",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(43,108,246,0.16)",
              }}
            >
              Open Word Cloud (SVG)
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme((t) => (t === DARK ? LIGHT : DARK))}
              style={{
                background: "transparent",
                color: v.subtle,
                border: "1px solid rgba(0,0,0,0.1)",
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {theme === DARK ? "Light UI" : "Dark UI"}
            </button>
          </div>
        </header>

        {/* Summary (top) */}
        <section
          style={{
            marginBottom: 24,
            background: v.cardBg,
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Summary</h3>
          {/* render summary state (empty initially) */}
          <p id="summaryText" style={{ color: v.subtle, marginTop: 6 }}>
            {summary || (theme === DARK ? "No summary available" : "")}
          </p>
        </section>

        {/* Upload */}
        <section
          style={{
            marginBottom: 28,
            background: v.cardBg,
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {/* Pass theme and onSummary so UploadPanel can update the top summary only after analysis */}
          <UploadPanel theme={theme} onSummary={setSummary} />
        </section>

        {/* Pipeline / Controls */}
        <aside style={{ width: "100%", marginTop: 20 }}>
          <div
            style={{
              padding: 18,
              background: v.cardBg,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.05)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              textAlign: "center",
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Pipeline</h4>
            <div
              style={{
                height: 100,
                background:
                  theme === DARK
                    ? "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))"
                    : "#f1f5f9",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: v.muted,
                fontSize: 13,
              }}
            >
              Processing pipeline: Upload → Analyse → Visualize
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 16,
                justifyContent: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <button
                  onClick={() => openApi("/api/sentiment_pie.svg")}
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg,#7c4dff 0%, #4fb0ff 100%)",
                    color: "#fff",
                    border: "none",
                    padding: "14px 18px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 700,
                    boxShadow: "0 10px 30px rgba(79,176,255,0.12)",
                  }}
                >
                  View Pie (full-screen)
                </button>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <button
                onClick={() => openApi("/api/wordcloud.svg")}
                style={{
                  width: "100%",
                  background: "#8b5cf6",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 6px 16px rgba(139,92,246,0.3)",
                }}
              >
                Open full SVG
              </button>
            </div>
          </div>
        </aside>

        {/* Footer */}
        <footer
          style={{
            marginTop: 40,
            textAlign: "center",
            color: v.muted,
            fontSize: 13,
          }}
        >
          Generated by eConsult Insight
        </footer>
      </div>
    </div>
  );
}