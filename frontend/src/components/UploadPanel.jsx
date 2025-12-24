// src/components/UploadPanel.jsx
import React, { useState } from "react";
import Papa from "papaparse";
import { postAnalyzeCsv, API_BASE } from "../api";

export default function UploadPanel({ onSummary = () => {} }) {
  const [fileNames, setFileNames] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Local preview for the first file chosen (quick UX)
  function handleLocalPreview(file) {
    Papa.parse(file, {
      header: true,
      preview: 50,
      complete: (results) => {
        const mapped = (results.data || []).map((r, idx) => ({
          id: r.id || r.ID || idx + 1,
          title: r.title || r.Title || "",
          comment: r.comment || r.text || r.comment_text || r.Comment || "",
          sentiment: r.sentiment || r.Sentiment || ""
        }));
        setRows(mapped);
      }
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const input = document.getElementById("csvFileInput");
    if (!input || !input.files || !input.files.length) {
      setError("Please choose one or more CSV files first.");
      return;
    }
    const files = Array.from(input.files);
    setFileNames(files.map(f => f.name));
    handleLocalPreview(files[0]);

    setLoading(true);
    try {
      const allRows = [];
      for (const f of files) {
        const data = await postAnalyzeCsv(f);
        const list = data.results ?? data.rows ?? data;
        if (Array.isArray(list)) {
          list.forEach((r) => {
            allRows.push({
              id: r.id ?? (allRows.length + 1),
              title: r.title ?? "",
              comment: r.comment ?? r.summary ?? "",
              sentiment: (r.sentiment ?? r.Sentiment ?? "").toString(),
              confidence: r.confidence ?? r.Confidence ?? ""
            });
          });
        }
      }

      if (!allRows.length) {
        throw new Error("No rows returned from uploads.");
      }

      setRows(allRows);

      // compute counts and notify parent to update top summary
      const total = allRows.length;
      const pos = allRows.filter(r => String(r.sentiment || "").toLowerCase() === "positive").length;
      const neg = allRows.filter(r => String(r.sentiment || "").toLowerCase() === "negative").length;
      const neu = allRows.filter(r => String(r.sentiment || "").toLowerCase() === "neutral").length;
      const summaryText = `Analysis complete — ${total} rows processed. Positive: ${pos}, Neutral: ${neu}, Negative: ${neg}.`;

      onSummary(summaryText); // <-- only here

      // sync merged comments to backend
      try {
        const comments = allRows.map(r => r.comment || "");
        await fetch(`${API_BASE}/api/set_comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comments }),
        });
      } catch (err) {
        console.warn("Failed to sync merged comments:", err);
      }

    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function openWordCloud() {
    window.open(`${API_BASE}/api/wordcloud.svg`, "_blank");
  }

  function handleFilesChange(e) {
    if (e.target.files && e.target.files[0]) {
      const names = Array.from(e.target.files).map(f => f.name);
      setFileNames(names);
      handleLocalPreview(e.target.files[0]);
    }
  }

  function downloadCsv() {
    if (!rows || !rows.length) {
      setError("No analysis to download — upload CSV(s) first.");
      return;
    }
    const cols = ["id","title","comment","sentiment","confidence"];
    const csvRows = [cols.join(",")];
    rows.forEach(r => {
      const vals = cols.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`);
      csvRows.push(vals.join(","));
    });
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const chooseLabelStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "linear-gradient(90deg,#7c4dff 0%, #4fb0ff 100%)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 8px 22px rgba(79,176,255,0.12)",
    border: "none"
  };

  const hiddenInputStyle = {
    position: "absolute",
    left: "-9999px",
    width: "1px",
    height: "1px",
    overflow: "hidden"
  };

  return (
    <div>
      <h2 style={{marginTop:0}}>Upload stakeholder comments (CSV)</h2>

      <form onSubmit={handleSubmit} style={{display:"flex", gap:12, alignItems:"center", marginBottom:18, flexWrap:"wrap"}}>
        <input
          id="csvFileInput"
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={handleFilesChange}
          style={hiddenInputStyle}
        />

        <label htmlFor="csvFileInput" style={chooseLabelStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 10l5-5 5 5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 5v12" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Choose files
        </label>

        <button type="submit" style={{background:"#ef7a30", color:"#fff", border:"none", padding:"8px 14px", borderRadius:6}}>
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        <button type="button" onClick={openWordCloud} style={{background:"#333", color:"#fff", border:"none", padding:"8px 12px", borderRadius:6}}>
          Open Word Cloud (SVG)
        </button>

        <button type="button" onClick={downloadCsv} style={{background:"#0b74ff", color:"#fff", border:"none", padding:"8px 12px", borderRadius:6}}>
          Download analysis
        </button>

        <div style={{marginLeft:12, color:"#9aa7b2", minWidth:160}}>
          {fileNames.length ? `${fileNames.length} file(s): ${fileNames.join(", ")}` : "No file selected"}
        </div>
      </form>

      {error && <div style={{color:"#ff7070", marginBottom:12}}>{error}</div>}

      <div style={{background:"#071225", borderRadius:8, padding:6}}>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead style={{color:"#9aa7b2", textAlign:"left"}}>
            <tr>
              <th style={{padding:"12px 8px"}}>ID</th>
              <th style={{padding:"12px 8px"}}>Title</th>
              <th style={{padding:"12px 8px"}}>Sentiment</th>
              <th style={{padding:"12px 8px"}}>Confidence</th>
              <th style={{padding:"12px 8px"}}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows && rows.length ? rows.map((r, idx) => (
              <tr key={idx} style={{borderTop:"1px solid rgba(255,255,255,0.03)"}}>
                <td style={{padding:"10px 8px"}}>{r.id}</td>
                <td style={{padding:"10px 8px"}}>{r.title}</td>
                <td style={{padding:"10px 8px", color: r.sentiment === "negative" ? "#ff6b6b" : r.sentiment === "positive" ? "#4bbf73" : "#9aa7b2"}}>
                  {r.sentiment ?? "-"}
                </td>
                <td style={{padding:"10px 8px"}}>{r.confidence ?? "-"}</td>
                <td style={{padding:"10px 8px"}}>{r.summary ?? r.comment ?? "-"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{padding:20, color:"#7b8794"}}>No preview data. Upload a CSV to analyze.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}