// src/components/TrendPanel.jsx
import React, { useEffect, useState } from "react";

function PieSVG({counts, size=220}){
  // counts: {positive, negative, neutral}
  const total = (counts.positive||0) + (counts.negative||0) + (counts.neutral||0) || 1;
  const pct = (n) => Math.round((n/total)*100);
  const values = [counts.positive||0, counts.neutral||0, counts.negative||0];
  const colors = ["#4bbf73","#9aa7b2","#ff6b6b"];
  const labels = ["Positive","Neutral","Negative"];

  // compute arcs
  let acc = 0;
  const cx = size/2, cy = size/2, r = size/2 - 10;
  const arcs = values.map((v, i) => {
    const start = acc / total * 2*Math.PI - Math.PI/2;
    acc += v;
    const end = acc / total * 2*Math.PI - Math.PI/2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return {d, color: colors[i], label: labels[i], value: v, pct: pct(v)};
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block"}}>
      <defs>
        <filter id="soft">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#soft)">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} fillOpacity={0.95} />)}
      </g>
      <circle cx={cx} cy={cy} r={r*0.45} fill="#071021"/>
      <text x={cx} y={cy-8} textAnchor="middle" fontSize="14" fill="#9aa7b2">Total</text>
      <text x={cx} y={cy+16} textAnchor="middle" fontSize="20" fill="#e6eef6" fontWeight="700">{total}</text>
    </svg>
  );
}

function Legend({counts}){
  const total = (counts.positive||0) + (counts.neutral||0) + (counts.negative||0) || 1;
  const items = [
    {label:"Positive", value: counts.positive||0, color:"#4bbf73"},
    {label:"Neutral", value: counts.neutral||0, color:"#9aa7b2"},
    {label:"Negative", value: counts.negative||0, color:"#ff6b6b"},
  ];
  return (
    <div style={{display:"flex", flexDirection:"column", gap:8}}>
      {items.map((it, idx) => (
        <div key={idx} style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:14, height:14, background:it.color, borderRadius:4}} />
          <div style={{flex:1, color:"#cbd5e1"}}>
            <div style={{fontSize:13, fontWeight:700}}>{it.label}</div>
            <div style={{fontSize:12, color:"#94a3b8"}}>{it.value} ({total? Math.round((it.value/total)*100):0}%)</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TrendPanel(){
  const [counts, setCounts] = useState({positive:0, negative:0, neutral:0});
  const [timeSeries, setTimeSeries] = useState([]); // small sparkline (counts per upload)

  useEffect(() => {
    const handler = (e) => {
      const rows = e.detail || [];
      let pos=0, neg=0, neu=0;
      // rows may include 'sentiment' field
      for (const r of rows){
        const s = (r.sentiment || "").toString().toLowerCase();
        if (s.includes("pos")) pos++;
        else if (s.includes("neg")) neg++;
        else neu++;
      }
      setCounts({positive:pos, negative:neg, neutral:neu});
      // append to time series with timestamp
      setTimeSeries(ts => {
        const now = new Date();
        const total = pos+neg+neu;
        const newPoint = {t: now.toLocaleTimeString(), total, pos, neg, neu};
        const next = [...ts, newPoint].slice(-12); // keep last 12 points
        return next;
      });
    };
    window.addEventListener("analysis_result", handler);
    return () => window.removeEventListener("analysis_result", handler);
  }, []);

  return (
    <div style={{background:"#081426", borderRadius:12, padding:18, boxShadow:"0 8px 30px rgba(2,6,23,0.6)"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:18}}>
        <div style={{display:"flex", gap:18, alignItems:"center"}}>
          <div style={{width:260}}>
            <PieSVG counts={counts} size={220} />
          </div>
          <div style={{width:220}}>
            <Legend counts={counts} />
          </div>
        </div>

        <div style={{flex:1}}>
          <h3 style={{margin:0, color:"#e6eef6"}}>Time Trend (recent uploads)</h3>
          <div style={{height:120, marginTop:12, background:"#061224", borderRadius:8, padding:10, display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Sparkline data={timeSeries} />
          </div>
          <div style={{marginTop:10, color:"#94a3b8", fontSize:13}}>
            Shows how many comments were processed in recent uploads. Each upload appends a new point.
          </div>
        </div>
      </div>
    </div>
  );
}

// Small sparkline (svg) for totals
function Sparkline({data}){
  const w = 420, h = 100, pad=8;
  if (!data || data.length === 0) {
    return <div style={{color:"#6b7280"}}>No trend data yet</div>;
  }
  const max = Math.max(...data.map(d => d.total), 1);
  const points = data.map((d, i) => {
    const x = pad + (i/(data.length-1||1))*(w-pad*2);
    const y = pad + (1 - (d.total/max))*(h-pad*2);
    return [x,y];
  });
  const path = points.map((p,i) => (i===0?`M ${p[0]} ${p[1]}`:`L ${p[0]} ${p[1]}`)).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.05"/>
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* area under curve */}
      {points.length>1 && <path d={`${path} L ${w-pad} ${h-pad} L ${pad} ${h-pad} Z`} fill="url(#g1)" stroke="none" />}
      {/* small dots */}
      {points.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#ffffff" fillOpacity={0.9}/>))}
    </svg>
  );
}