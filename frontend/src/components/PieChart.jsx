// src/components/PieChart.jsx
import React, { useEffect, useState, useMemo } from "react";

/**
 * PieChart component
 *
 * Props:
 *  - data: optional object { positive: number, negative: number, neutral: number }
 *  - width: optional px width (default: responsive)
 *  - height: optional px height
 *  - apiFullSvg: optional URL to open for full-screen SVG (defaults to /api/sentiment_pie.svg)
 *
 * Behavior:
 *  - If `data` prop is provided it is used.
 *  - Otherwise the component requests /api/sentiment_summary (GET) expecting JSON { positive, negative, neutral }.
 *  - If nothing is available it renders an empty state.
 */
export default function PieChart({
  data = null,
  width = 520,
  height = 420,
  apiFullSvg = "/api/sentiment_pie.svg"
}) {
  const [counts, setCounts] = useState(data);
  const [hover, setHover] = useState(null);
  const [error, setError] = useState(null);

  // Try to fetch summary if no data prop supplied
  useEffect(() => {
    if (data) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch("/api/sentiment_summary");
        if (!resp.ok) {
          // not fatal — keep empty
          return;
        }
        const json = await resp.json();
        if (mounted) {
          // expect json.positive etc — fallback to 0 if missing
          setCounts({
            positive: Number(json.positive || 0),
            negative: Number(json.negative || 0),
            neutral: Number(json.neutral || 0)
          });
        }
      } catch (err) {
        // ignore but set error for dev visibility
        if (mounted) setError(String(err));
      }
    })();
    return () => { mounted = false; };
  }, [data]);

  // compute totals and percentages
  const summary = useMemo(() => {
    const p = counts?.positive ?? 0;
    const n = counts?.negative ?? 0;
    const u = counts?.neutral ?? 0;
    const total = p + n + u;
    const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
    return { positive: p, negative: n, neutral: u, total, pct };
  }, [counts]);

  // arcs angles (donut)
  const arcs = useMemo(() => {
    const { positive, negative, neutral, total } = summary;
    if (!total) return [];
    // order for nice visual: positive, negative, neutral
    const items = [
      { key: "positive", label: "Positive", value: positive, color: "#60c38a" },
      { key: "negative", label: "Negative", value: negative, color: "#ff7b7b" },
      { key: "neutral", label: "Neutral", value: neutral, color: "#9aa7b2" }
    ];
    const angles = [];
    let start = 0;
    items.forEach(it => {
      const angle = (it.value / total) * Math.PI * 2;
      angles.push({ ...it, start, angle, end: start + angle });
      start += angle;
    });
    return angles;
  }, [summary]);

  // helper: create arc path for donut segment (centered at cx,cy)
  function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
    // convert polar to cartesian
    const polarToCartesian = (cx, cy, r, angle) => {
      return {
        x: cx + r * Math.cos(angle - Math.PI / 2),
        y: cy + r * Math.sin(angle - Math.PI / 2)
      };
    };

    const startOuter = polarToCartesian(cx, cy, rOuter, startAngle);
    const endOuter = polarToCartesian(cx, cy, rOuter, endAngle);
    const startInner = polarToCartesian(cx, cy, rInner, endAngle);
    const endInner = polarToCartesian(cx, cy, rInner, startAngle);

    const largeArc = endAngle - startAngle <= Math.PI ? "0" : "1";

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
      "Z"
    ].join(" ");
  }

  function openFull() {
    // open full-sized SVG in a new tab
    const url = apiFullSvg.startsWith("http") ? apiFullSvg : window.location.origin + apiFullSvg;
    window.open(url, "_blank");
  }

  // layout / sizes
  const svgW = width;
  const svgH = height;
  const cx = svgW * 0.35;
  const cy = svgH / 2;
  const outerR = Math.min(svgW, svgH) * 0.3;
  const innerR = outerR * 0.56;

  // UI: empty state
  if (!summary.total) {
    return (
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <div style={{
          width: Math.min(svgW, 480),
          background: "transparent",
          borderRadius: 12,
          padding: 18,
          textAlign: "center",
          color: "#9aa7b2"
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e6eef6" }}>No sentiment data yet</div>
          <div style={{ marginTop: 8 }}>Upload CSV(s) to generate sentiment visuals.</div>
          {error && <div style={{ marginTop: 8, color: "#ff9595", fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "center", width: "100%" }}>
      <div style={{
        background: "transparent",
        padding: 8,
        borderRadius: 12,
        minWidth: 360,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" style={{ overflow: "visible" }}>
          {/* background subtle circle */}
          <defs>
            <linearGradient id="pg" x1="0" x2="1">
              <stop offset="0" stopColor="#7c4dff"/>
              <stop offset="1" stopColor="#4fb0ff"/>
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* center label */}
          <g>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fill="#e6eef6" fontWeight="800" style={{ fontFamily: "Inter, Arial, sans-serif" }}>
              {summary.total} items
            </text>
            <text x={cx} y={cy + 18} textAnchor="middle" fontSize="13" fill="#9aa7b2" style={{ fontFamily: "Inter, Arial, sans-serif" }}>
              Sentiments
            </text>
          </g>

          {/* donut arcs */}
          <g>
            {arcs.map((a, i) => {
              const path = describeArc(cx, cy, outerR, innerR, a.start, a.end);
              // for animation we use stroke-dasharray trick via pathLength attribute and CSS animation
              return (
                <path
                  key={a.key}
                  d={path}
                  fill={a.color}
                  opacity={hover && hover !== a.key ? 0.65 : 1}
                  onMouseEnter={() => setHover(a.key)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    transition: "opacity .24s ease, transform .18s ease",
                    transformOrigin: `${cx}px ${cy}px`,
                    cursor: "pointer",
                    // slight scale on hover
                    transform: hover === a.key ? `scale(1.02)` : "none",
                  }}
                />
              );
            })}
          </g>

          {/* outer percent labels (simple placement) */}
          <g>
            {arcs.map((a) => {
              const mid = a.start + (a.angle / 2);
              const labelR = outerR + 28;
              const lx = cx + labelR * Math.cos(mid - Math.PI / 2);
              const ly = cy + labelR * Math.sin(mid - Math.PI / 2);
              const pct = summary.pct(a.value);
              return (
                <text key={a.key + "-lbl"} x={lx} y={ly} textAnchor="middle" fontSize="13" fill="#e6eef6" style={{ fontWeight: 700 }}>
                  {pct}%
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* legend & controls */}
      <div style={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          {["positive", "negative", "neutral"].map((k) => {
            const item = arcs.find(a => a.key === k);
            if (!item) return null;
            const pct = summary.pct(item.value);
            return (
              <div key={k} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "8px 12px",
                borderRadius: 8,
                transition: "background .18s ease",
                background: hover === k ? "rgba(255,255,255,0.018)" : "transparent",
                cursor: "default"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: 4,
                    background: item.color, boxShadow: "0 6px 18px rgba(0,0,0,0.35)"
                  }} />
                  <div style={{ color: "#e6eef6", fontWeight: 700 }}>{item.label}</div>
                </div>

                <div style={{ textAlign: "right", color: "#9aa7b2" }}>
                  <div style={{ fontWeight: 700, color: "#e6eef6" }}>{item.value}</div>
                  <div style={{ fontSize: 12 }}>{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={openFull}
            style={{
              flex: 1,
              background: "linear-gradient(90deg,#7c4dff 0%, #4fb0ff 100%)",
              color: "#fff",
              border: "none",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700
            }}>
            Open full pie (SVG)
          </button>

          <button
            onClick={() => {
              // quick "focus" effect: zoom the chart container in place
              // we toggle hover state to highlight positive briefly
              setHover("positive");
              setTimeout(() => setHover(null), 650);
            }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.04)",
              color: "#e6eef6",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600
            }}>
            Spotlight
          </button>
        </div>
      </div>
    </div>
  );
}