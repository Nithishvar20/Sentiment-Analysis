// src/components/Landing.jsx
import React from "react";

/**
 * Landing hero — updated:
 *  - Left side uses Poppins (professional).
 *  - Right side keeps Rubik + refined stacked cards & animations.
 *  - No PNGs — only SVG / CSS animations.
 *
 * Props:
 *   onEnter: function called when "Enter App" is clicked
 *   theme: "dark" | "light" (optional)
 */
export default function Landing({ onEnter = () => {}, theme = "dark" }) {
  const dark = theme === "dark";
  const bg = dark ? "#06121b" : "#f8fafc";
  const cardBg = dark ? "rgba(255,255,255,0.02)" : "#ffffff";
  const headingColor = dark ? "#ffffff" : "#111827";
  const bodyColor = dark ? "#9aa7b2" : "#374151";
  const accentStart = "#7c4dff";
  const accentEnd = "#4fb0ff";

  // inline keyframes + utility CSS
  const animCss = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Rubik:wght@300;400;500;700;800&display=swap');

    :root{
      --accent-start: ${accentStart};
      --accent-end: ${accentEnd};
      --card-bg: ${cardBg};
      --heading: ${headingColor};
      --muted: ${bodyColor};
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.12); opacity: 0.66; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes floaty {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
      100% { transform: translateY(0px); }
    }
    @keyframes lineIn { from { stroke-dashoffset: 240 } to { stroke-dashoffset: 0 } }

    .sparkline path.stroke-anim { stroke-dasharray: 240; stroke-dashoffset: 240; animation: lineIn 1.8s ease-out forwards; }
    .pulse-dot { animation: pulse 1.8s ease-in-out infinite; }

    /* small niceties for focus & buttons */
    .ls-enter-btn { transition: box-shadow .18s ease, transform .12s ease; }
    .ls-enter-btn:active { transform: translateY(1px); }
    .ls-learn-btn { transition: background .14s ease, color .14s ease; }

    /* responsive */
    @media (max-width: 980px) {
      .ls-grid { grid-template-columns: 1fr; gap: 28px; }
      .ls-right { order: 2; }
    }
  `;

  return (
    <section
      aria-label="Landing hero"
      style={{
        width: "100%",
        minHeight: "78vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(180deg, ${bg} 0%, ${bg} 100%)`,
        padding: "48px 28px",
        boxSizing: "border-box",
      }}
    >
      {/* Inject fonts and animations */}
      <style>{animCss}</style>

      <div
        className="ls-grid"
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "grid",
          gridTemplateColumns: "1fr 480px",
          gap: 36,
          alignItems: "start",
        }}
      >
        {/* Left: copy & CTA — USE POPPINS for left side for a more professional look */}
        <div style={{ fontFamily: "'Poppins', Inter, Arial, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div
              aria-hidden
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${accentStart}, ${accentEnd})`,
                boxShadow: "0 12px 36px rgba(79,176,255,0.08)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 6h16M4 12h10M4 18h16" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ color: bodyColor, fontSize: 13, fontWeight: 600 }}>LegiSense</div>
          </div>

          <h1
            style={{
              margin: 0,
              color: headingColor,
              fontSize: 48,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            LegiSense: AI-Based Feedback Analysis for MCA
          </h1>

          <p
            style={{
              marginTop: 18,
              color: bodyColor,
              fontSize: 16,
              maxWidth: 720,
              lineHeight: 1.65,
              fontWeight: 400,
            }}
          >
            Quickly analyze stakeholder feedback across languages. Automatic sentiment tagging,
            combined visual summaries, exportable word clouds and donut charts — designed for ministries
            and civic engagement teams to surface policy insights fast.
          </p>

          <div style={{ marginTop: 28, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={onEnter}
              className="ls-enter-btn"
              style={{
                background: `linear-gradient(90deg, ${accentStart} 0%, ${accentEnd} 100%)`,
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 14px 38px rgba(79,176,255,0.12)",
                fontSize: 15,
              }}
            >
              Get Started
            </button>

            
          </div>
          

          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            <div style={{ background: cardBg, padding: "10px 14px", borderRadius: 10, color: bodyColor }}>
              <strong style={{ color: headingColor }}>Languages:</strong> English, Tamil, Telugu, Hindi, Kannada, Malayalam
            </div>
            <div style={{ background: cardBg, padding: "10px 14px", borderRadius: 10, color: bodyColor }}>
              <strong style={{ color: headingColor }}>Visuals:</strong> Word Cloud · Pie Chart · Export SVG · Download Report
            </div>
          </div>
        </div>

        {/* Right: refined stacked insight cards — uses Rubik for a slightly tech/modern feel */}
        <div className="ls-right" style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Rubik', Inter, Arial, sans-serif" }}>
          {/* Card 1 — Animated Donut + KPIs */}
          <div style={{
            background: cardBg,
            borderRadius: 12,
            padding: 18,
            boxShadow: dark ? "0 8px 30px rgba(2,6,23,0.34)" : "0 6px 18px rgba(15,23,42,0.04)",
            minHeight: 120,
            display: "flex",
            gap: 14,
            alignItems: "center"
          }}>
            <div style={{ width: 110, height: 110, display: "grid", placeItems: "center" }}>
              {/* donut svg (animated arcs) */}
              <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden>
                <defs>
                  <linearGradient id="lgA" x1="0" x2="1">
                    <stop offset="0" stopColor={accentStart}/>
                    <stop offset="1" stopColor={accentEnd}/>
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="44" fill={dark ? "#071225" : "#fff"} stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                <path d="M60,16 A44,44 0 0 1 98.5,40" fill="none" stroke="url(#lgA)" strokeWidth="12" strokeLinecap="round" strokeDasharray="140" strokeDashoffset="140">
                  <animate attributeName="stroke-dashoffset" from="140" to="0" dur="1.0s" fill="freeze" />
                </path>
                <path d="M98.5,40 A44,44 0 0 1 70,98" fill="none" stroke="#ff6b6b" strokeWidth="12" strokeLinecap="round" strokeDasharray="110" strokeDashoffset="110">
                  <animate attributeName="stroke-dashoffset" from="110" to="0" dur="1.2s" begin="0.08s" fill="freeze" />
                </path>
                <path d="M70,98 A44,44 0 0 1 22,62" fill="none" stroke="#9aa7b2" strokeWidth="12" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="100">
                  <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1.4s" begin="0.16s" fill="freeze" />
                </path>
                <circle cx="60" cy="60" r="24" fill={dark ? "#06121b" : "#f7fafc"} />
                <text x="60" y="64" textAnchor="middle" fontSize="10" fill={headingColor} fontWeight="700">VoxInsights</text>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: bodyColor }}>Combined sentiment</div>
                  <div style={{ fontSize: 18, color: headingColor, fontWeight: 700, marginTop: 6 }}>Aggregate view</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  
                
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: accentStart }} />
                <div style={{ color: bodyColor, fontSize: 13 }}>Positive</div>

                <div style={{ width: 8, height: 8, borderRadius: 4, background: "#ff6b6b", marginLeft: 12 }} />
                <div style={{ color: bodyColor, fontSize: 13 }}>Negative</div>

                <div style={{ width: 8, height: 8, borderRadius: 4, background: "#9aa7b2", marginLeft: 12 }} />
                <div style={{ color: bodyColor, fontSize: 13 }}>Neutral</div>
              </div>
            </div>
          </div>

          {/* Card 2 — Sparkline (animated) */}
          <div style={{
            background: cardBg,
            borderRadius: 12,
            padding: 16,
            boxShadow: dark ? "0 8px 30px rgba(2,6,23,0.28)" : "0 6px 18px rgba(15,23,42,0.04)",
            minHeight: 110,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: bodyColor, fontSize: 13 }}>Engagement trend</div>
                <div style={{ color: headingColor, fontSize: 16, fontWeight: 700, marginTop: 6 }}>Comments over time</div>
              </div>
              <div style={{ color: bodyColor, fontSize: 13 }}>Live</div>
            </div>

            <div style={{ marginTop: 10, width: "100%", height: 48 }}>
              <svg viewBox="0 0 400 48" width="100%" height="48" className="sparkline" aria-hidden>
                <defs>
                  <linearGradient id="sgr" x1="0" x2="1">
                    <stop offset="0" stopColor={accentStart}/>
                    <stop offset="1" stopColor={accentEnd}/>
                  </linearGradient>
                </defs>

                <g stroke="rgba(255,255,255,0.03)" strokeWidth="1">
                  <line x1="0" y1="4" x2="400" y2="4" />
                  <line x1="0" y1="24" x2="400" y2="24" />
                  <line x1="0" y1="44" x2="400" y2="44" />
                </g>

                <path d="M0,30 L40,28 L80,18 L120,22 L160,12 L200,18 L240,14 L280,20 L320,10 L360,18 L400,12 L400,48 L0,48 Z"
                      fill="rgba(79,176,255,0.06)" />

                <path d="M0,30 L40,28 L80,18 L120,22 L160,12 L200,18 L240,14 L280,20 L320,10 L360,18 L400,12"
                      fill="none" stroke="url(#sgr)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-anim" />

                <circle cx="40" cy="28" r="4" fill={accentEnd}>
                  <animate attributeName="cx" values="40;120;200;280;360;400" dur="4s" repeatCount="indefinite"/>
                </circle>
              </svg>
            </div>
          </div>

          {/* Card 3 — KPI row with pulsing statuses */}
          <div style={{
            background: cardBg,
            borderRadius: 12,
            padding: 14,
            boxShadow: dark ? "0 8px 30px rgba(2,6,23,0.22)" : "0 6px 18px rgba(15,23,42,0.03)",
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: headingColor, fontWeight: 700 }}>Sentiment distribution</div>
                <div style={{ color: bodyColor, fontSize: 13 }}>Summary across uploads</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pulse-dot" style={{ width: 10, height: 10, borderRadius: 6, background: accentStart, display: "inline-block" }} />
                <div style={{ color: bodyColor, fontSize: 13 }}>Positive</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pulse-dot" style={{ width: 10, height: 10, borderRadius: 6, background: "#ff6b6b", display: "inline-block", animationDelay: "0.12s" }} />
                <div style={{ color: bodyColor, fontSize: 13 }}>Negative</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pulse-dot" style={{ width: 10, height: 10, borderRadius: 6, background: "#9aa7b2", display: "inline-block", animationDelay: "0.24s" }} />
                <div style={{ color: bodyColor, fontSize: 13 }}>Neutral</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}