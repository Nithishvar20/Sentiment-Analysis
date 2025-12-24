// src/components/WordCloudButton.jsx
import React from "react";

export default function WordCloudButton(){
  const openCloud = () => {
    window.open("/api/wordcloud.svg", "_blank");
  };
  return (
    <button onClick={openCloud} style={{
      width:"100%",
      padding:"10px 12px",
      borderRadius:8,
      border:"none",
      background:"linear-gradient(90deg,#7c3aed,#06b6d4)",
      color:"#fff",
      fontWeight:700
    }}>
      View Word Cloud (full-screen)
    </button>
  );
}