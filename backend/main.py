# main.py (updated)
from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io, os, html, datetime, hashlib, math, random
from collections import Counter
from typing import List, Tuple, Dict, Optional
import joblib

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "sentiment_model.joblib")

app = FastAPI(title="SIH eConsult Final Backend")

# CORS - adjust if you run frontend on different host/port
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://0.0.0.0:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try to load optional pre-trained model (joblib). If not present, work with rule-based fallback.
model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        app.state.model_loaded = True
    except Exception:
        model = None
        app.state.model_loaded = False
else:
    app.state.model_loaded = False

# In-memory store for last uploaded comments (wordcloud generation)
last_comments: List[str] = []
# In-memory store for last analysis results (used for pie chart)
last_results: List[Dict] = []
# Trend bookkeeping (optional frontend usage)
trend_points: List[Dict] = []
TREND_MAX_POINTS = 80

@app.get("/")
def root():
    return {"message": "SIH eConsult final backend running", "time": datetime.datetime.utcnow().isoformat()}

@app.get("/api/status")
def status():
    return {"status": "ok", "model_loaded": bool(model)}

# ----------------------------
# Deterministic jitter & improved rule/model fallback
def _deterministic_jitter(comment: str, scale: float = 0.04) -> float:
    if not comment:
        return 0.0
    h = hashlib.md5(comment.encode("utf-8")).hexdigest()
    n = int(h[:8], 16)
    frac = (n % 1000) / 999.0
    return (frac * 2 - 1) * scale

def _normalize_conf(conf: float) -> float:
    return max(0.0, min(1.0, conf))

def rule_sentiment(comment: str) -> Tuple[str, float]:
    s = (comment or "").lower()

    pos_en_strong = ["great", "excellent", "well", "improve"]
    pos_en_weak   = ["good", "support", "positive", "benefit", "help"]
    neg_en_strong = ["poor", "harsh", "bad", "oppose","didnt"]
    neg_en_weak   = ["concern", "problem", "issue", "confusing", "burden"]

    pos_ta = ["உதவி","😀", "நன்மை", "சிறந்த", "மகிழ்ச்சி","நல்லது","திருப்தி"]
    neg_ta = ["தவறு", "பிரச்சனை","😭","மோசமாக", "மோசமான", "எதிர்ப்பு", "கவலை","சிரமம்"]

    pos_te = ["మంచి", "ప్రయోజనం", "సహాయం","🔥", "సంతోషం", "లాభం"]
    neg_te = ["చెడు", "భారం", "సమస్య", "తప్పు","అస్పష్టంగా "]

    pos_ml = ["നല്ലത്", "ഫലപ്രദം","ജനങ്ങൾക്ക് ", "ഉപകാരപ്രദം", "ഉത്തമം"]
    neg_ml = ["മോശം", "പ്രശ്നം", "ഭാരം","പ്രശ്നങ്ങൾ ", "തകരാറ്","😶"]

    pos_kn = ["ಉತ್ತಮ", "ಲಾಭ", "ಸಹಾಯ","😂"]
    neg_kn = ["ಕೆಟ್ಟ", "ಸಮಸ್ಯೆ", "ಭಾರ", "ತಪ್ಪು","ತೊಂದರೆ"]

    pos_hi = ["अच्छा", "लाभ", "सहायता", "सकारात्मक", "बेहतरीन", "उपयोगी"]
    neg_hi = ["खराब", "समस्या", "विपरीत", "बुरा", "बोझ","क्योंकि "]

    def check_lists(kw_list):
        for kw in kw_list:
            if kw in s:
                return True
        return False

    # strong english
    if check_lists(pos_en_strong) or check_lists(neg_en_strong):
        if any(k in s for k in pos_en_strong):
            base, label = 0.86, "positive"
        else:
            base, label = 0.86, "negative"
        return label, round(_normalize_conf(base + _deterministic_jitter(comment, 0.04)), 3)

    # weak english
    if check_lists(pos_en_weak) or check_lists(neg_en_weak):
        if any(k in s for k in pos_en_weak):
            base, label = 0.78, "positive"
        else:
            base, label = 0.78, "negative"
        return label, round(_normalize_conf(base + _deterministic_jitter(comment, 0.05)), 3)

    # other languages (treated as slightly strong)
    for kw in pos_hi + pos_ta + pos_te + pos_ml + pos_kn:
        if kw in s:
            base = 0.84
            return "positive", round(_normalize_conf(base + _deterministic_jitter(comment, 0.04)), 3)
    for kw in neg_hi + neg_ta + neg_te + neg_ml + neg_kn:
        if kw in s:
            base = 0.84
            return "negative", round(_normalize_conf(base + _deterministic_jitter(comment, 0.04)), 3)

    if not s.strip():
        return "neutral", 0.40

    base = 0.64
    return "neutral", round(_normalize_conf(base + _deterministic_jitter(comment, 0.06)), 3)

def safe_model_predict(comment: str) -> Tuple[str, float]:
    try:
        if not model:
            return rule_sentiment(comment)
        pred = model.predict([comment])[0]
        prob_val = None
        try:
            proba = model.predict_proba([comment])[0]
            prob_val = float(max(proba))
        except Exception:
            prob_val = None

        if hasattr(model, "classes_"):
            classes = model.classes_
            if all(isinstance(c, str) for c in classes):
                label = str(pred)
            else:
                label_map = {0: 'negative', 1: 'neutral', 2: 'positive'}
                label = label_map.get(int(pred), str(pred))
        else:
            label = str(pred)

        if prob_val is None:
            _, derived_conf = rule_sentiment(comment)
            return label, round(float(derived_conf), 3)
        else:
            return label, round(float(prob_val), 3)
    except Exception:
        return rule_sentiment(comment)

# ---------- helper to parse one CSV bytes -> DataFrame (normalize comment col) ----------
def _read_csv_bytes(content: bytes) -> pd.DataFrame:
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")
    # normalize column names
    cols = [c.lower() for c in df.columns]
    if "comment" not in cols:
        for cand in ("text", "body"):
            if cand in cols:
                raw = df
                # rename actual column to 'comment'
                actual = [c for c in df.columns if c.lower() == cand][0]
                df = df.rename(columns={actual: "comment"})
                break
    if "comment" not in [c.lower() for c in df.columns]:
        raise HTTPException(status_code=400, detail="CSV must contain 'comment' column (or 'text'/'body').")
    return df

# ----------------------------
# Single-file upload (keeps compatibility)
@app.post("/api/upload_csv")
async def upload_csv(file: UploadFile = File(...)):
    global last_comments, last_results, trend_points
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file (.csv).")
    content = await file.read()
    df = _read_csv_bytes(content)

    results = []
    comments_storage = []
    cols_lower = {c.lower(): c for c in df.columns}
    has_conf_col = "confidence" in cols_lower

    for idx, row in df.iterrows():
        comment = str(row.get(cols_lower.get("comment"), "") or "").strip()
        comments_storage.append(comment)
        csv_conf = None
        if has_conf_col:
            try:
                raw = row.get(cols_lower.get("confidence"))
                if raw is not None and str(raw).strip() != "":
                    csv_conf = float(raw)
            except Exception:
                csv_conf = None

        if csv_conf is not None:
            sentiment, _ = safe_model_predict(comment) if model else rule_sentiment(comment)
            confidence = float(csv_conf)
        else:
            sentiment, confidence = safe_model_predict(comment) if model else rule_sentiment(comment)

        if "sentiment" in cols_lower:
            scol = cols_lower["sentiment"]
            raw_label = row.get(scol, None)
            if raw_label and str(raw_label).strip():
                sentiment = str(raw_label).strip()

        summary = (comment.split(".")[0].strip()) if comment else ""
        results.append({
            "id": int(row.get(cols_lower.get("id"), idx + 1)) if cols_lower.get("id") else (idx + 1),
            "title": row.get(cols_lower.get("title"), "") if cols_lower.get("title") else "",
            "comment": comment,
            "sentiment": sentiment,
            "confidence": round(float(confidence), 3),
            "summary": summary
        })

    # normalize confidences to 2 dp for frontend display and update memory
    for r in results:
        try:
            r["confidence"] = round(float(r.get("confidence", 0.0)), 2)
        except Exception:
            r["confidence"] = 0.6

    last_comments = comments_storage
    last_results = results

    # update trend_points
    try:
        pos = sum(1 for r in results if str(r.get("sentiment")).lower() == "positive")
        neg = sum(1 for r in results if str(r.get("sentiment")).lower() == "negative")
        neu = sum(1 for r in results if str(r.get("sentiment")).lower() == "neutral")
        now_iso = datetime.datetime.utcnow().isoformat()
        point = {"time": now_iso, "positive": pos, "neutral": neu, "negative": neg, "total": len(results)}
        trend_points.append(point)
        if len(trend_points) > TREND_MAX_POINTS:
            trend_points[:] = trend_points[-TREND_MAX_POINTS:]
    except Exception:
        pass

    return {"inserted": len(df), "results": results, "rows": results}

# ----------------------------
# New endpoint: accept multiple CSV files in one request
@app.post("/api/upload_csvs")
async def upload_multiple_csvs(files: List[UploadFile] = File(...)):
    """
    Accept multiple CSV files at once. The endpoint will merge rows from all files,
    run the same sentiment logic on each row, update last_comments/last_results,
    and return combined results.
    """
    global last_comments, last_results, trend_points
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="Please upload one or more CSV files.")

    combined_results = []
    combined_comments = []
    total_rows = 0

    for file in files:
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not a CSV.")
        content = await file.read()
        df = _read_csv_bytes(content)
        cols_lower = {c.lower(): c for c in df.columns}
        has_conf_col = "confidence" in cols_lower

        for idx, row in df.iterrows():
            total_rows += 1
            comment = str(row.get(cols_lower.get("comment"), "") or "").strip()
            combined_comments.append(comment)
            csv_conf = None
            if has_conf_col:
                try:
                    raw = row.get(cols_lower.get("confidence"))
                    if raw is not None and str(raw).strip() != "":
                        csv_conf = float(raw)
                except Exception:
                    csv_conf = None

            if csv_conf is not None:
                sentiment, _ = safe_model_predict(comment) if model else rule_sentiment(comment)
                confidence = float(csv_conf)
            else:
                sentiment, confidence = safe_model_predict(comment) if model else rule_sentiment(comment)

            if "sentiment" in cols_lower:
                scol = cols_lower["sentiment"]
                raw_label = row.get(scol, None)
                if raw_label and str(raw_label).strip():
                    sentiment = str(raw_label).strip()

            summary = (comment.split(".")[0].strip()) if comment else ""
            combined_results.append({
                "id": int(row.get(cols_lower.get("id"), total_rows)) if cols_lower.get("id") else total_rows,
                "title": row.get(cols_lower.get("title"), "") if cols_lower.get("title") else "",
                "comment": comment,
                "sentiment": sentiment,
                "confidence": round(float(confidence), 3),
                "summary": summary
            })

    # normalize confidences and update memory
    for r in combined_results:
        try:
            r["confidence"] = round(float(r.get("confidence", 0.0)), 2)
        except Exception:
            r["confidence"] = 0.6

    last_comments = combined_comments
    last_results = combined_results

    # update trend_points for this combined batch
    try:
        pos = sum(1 for r in combined_results if str(r.get("sentiment")).lower() == "positive")
        neg = sum(1 for r in combined_results if str(r.get("sentiment")).lower() == "negative")
        neu = sum(1 for r in combined_results if str(r.get("sentiment")).lower() == "neutral")
        now_iso = datetime.datetime.utcnow().isoformat()
        point = {"time": now_iso, "positive": pos, "neutral": neu, "negative": neg, "total": len(combined_results)}
        trend_points.append(point)
        if len(trend_points) > TREND_MAX_POINTS:
            trend_points[:] = trend_points[-TREND_MAX_POINTS:]
    except Exception:
        pass

    return {"inserted": total_rows, "results": combined_results, "rows": combined_results}

# ----------------------------
# Wordcloud endpoint (keeps your decorative SVG)
@app.get("/api/wordcloud.svg")
def wordcloud_svg(limit_words: int = 120):
    import html as _html
    global last_comments
    if last_comments:
        text = " ".join(last_comments)
    else:
        text = "consultation comments governance policy feedback citizen stakeholders reform improvement concern issue penalty threshold reporting"

    words = [w.strip().lower() for w in text.split()]
    words = [''.join(ch for ch in w if ch.isalnum()) for w in words if w.strip()]
    if not words:
        raise HTTPException(status_code=404, detail="No words")
    freqs = Counter(words)
    top = freqs.most_common(limit_words)
    if not top:
        raise HTTPException(status_code=404, detail="No words")

    vw, vh = 1600, 1000
    svg_parts = []
    svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100vh" viewBox="0 0 {vw} {vh}" preserveAspectRatio="none">')
    svg_parts.append('''
      <style>
        html,body{margin:0;height:100%;background:#06121b}
        svg{display:block}
      </style>
    ''')
    svg_parts.append(f'''
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#071722"/>
          <stop offset="100%" stop-color="#05121a"/>
        </linearGradient>
        <radialGradient id="vign" cx="50%" cy="50%" r="75%">
          <stop offset="60%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.55)" />
        </radialGradient>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
    ''')
    svg_parts.append(f'<rect width="100%" height="100%" fill="url(#bg)"/>')
    svg_parts.append(f'<rect width="100%" height="100%" fill="url(#vign)" />')

    palette = ["#ff6b35","#ff8b5a","#ffd166","#16a34a","#60a5fa","#a78bfa","#f472b6","#fb7185","#94a3b8","#9dd3c8"]
    max_count = max(c for _, c in top)
    min_count = min(c for _, c in top)

    def size_for(count):
        if max_count == min_count:
            return 24
        rel = (count - min_count) / (max_count - min_count + 1e-9)
        s = 14 + int((rel ** 0.9) * 64)
        return max(12, min(120, s))

    headline_count = min(8, len(top))
    headline = top[:headline_count]
    body = top[headline_count:headline_count + 80]
    footer = top[headline_count + 80: limit_words]

    head_y = int(vh * 0.28)
    head_x_start = 120
    head_x_end = vw - 120
    head_cols = headline_count or 1
    for i, (word, count) in enumerate(headline):
        px = int(head_x_start + i * (head_x_end - head_x_start) / max(1, head_cols-1))
        py = head_y + random.randint(-14, 14)
        size = size_for(count) + 12
        color = palette[i % len(palette)]
        rot = random.randint(-8, 8) if size > 36 and random.random() < 0.6 else 0
        svg_parts.append(f'<text x="{px}" y="{py}" text-anchor="middle" font-family="Poppins, Inter, Arial" font-weight="800" font-size="{size}" fill="{color}" transform="rotate({rot} {px} {py})" style="filter:url(#softShadow)">{html.escape(word)}</text>')

    cols = 10
    top_margin = int(vh * 0.36)
    bottom_margin = int(vh * 0.78)
    grid_h = bottom_margin - top_margin
    grid_y0 = top_margin
    grid_x0 = 80
    grid_w = vw - 160
    cell_w = grid_w // cols
    rows = math.ceil(len(body) / cols) if len(body) > 0 else 1
    cell_h = max(60, grid_h // rows)
    idx = 0
    for r in range(rows):
        for c in range(cols):
            if idx >= len(body):
                break
            word, count = body[idx]
            px = grid_x0 + c * cell_w + cell_w // 2 + random.randint(-8,8)
            py = grid_y0 + r * cell_h + cell_h // 2 + random.randint(-6,6)
            size = size_for(count)
            size = int(size * (0.92 + random.random()*0.16))
            rot = random.randint(-12,12) if size > 32 and random.random() < 0.22 else random.randint(-6,6) if random.random() < 0.08 else 0
            color = palette[idx % len(palette)]
            opacity = 0.94 if size > 18 else 0.82
            svg_parts.append(f'<text x="{px}" y="{py}" text-anchor="middle" font-family="Inter, Poppins, Arial" font-weight="700" font-size="{size}" fill="{color}" fill-opacity="{opacity}" transform="rotate({rot} {px} {py})" style="filter:url(#softShadow)">{html.escape(word)}</text>')
            idx += 1

    footer_y = int(vh * 0.9)
    fx = 80
    for j, (word, count) in enumerate(footer):
        px = fx + j * 90
        py = footer_y + random.randint(-6, 6)
        size = max(10, int(size_for(count) * 0.6))
        color = palette[(headline_count + j) % len(palette)]
        svg_parts.append(f'<text x="{px}" y="{py}" text-anchor="start" font-family="Inter, Arial" font-weight="600" font-size="{size}" fill="{color}" fill-opacity="0.75">{html.escape(word)}</text>')

    svg_parts.append(f'<text x="{vw-18}" y="{vh-18}" text-anchor="end" font-family="Inter, Arial" font-size="12" fill="#9aa7b2" fill-opacity="0.7">Generated by eConsult Insight</text>')
    svg_parts.append('</svg>')
    svg = "\n".join(svg_parts)
    return Response(content=svg, media_type='image/svg+xml')

# ----------------------------
# Sentiment counts endpoint (used by frontend to draw pie locally if desired)
@app.get("/api/sentiment_counts")
def sentiment_counts():
    global last_comments, last_results
    pos = neu = neg = 0
    if last_results:
        for r in last_results:
            lab = str(r.get("sentiment", "neutral")).lower()
            if lab == "positive":
                pos += 1
            elif lab == "negative":
                neg += 1
            else:
                neu += 1
    else:
        for c in last_comments:
            lab, _ = safe_model_predict(c)
            if lab == "positive":
                pos += 1
            elif lab == "negative":
                neg += 1
            else:
                neu += 1

    total = pos + neu + neg
    def pct(x): return round((x / total * 100) if total else 0, 1)
    return {"positive": pos, "neutral": neu, "negative": neg, "total": total,
            "pcts": {"positive": pct(pos), "neutral": pct(neu), "negative": pct(neg)}}

# ----------------------------
# Single, canonical sentiment pie endpoint (donut)
@app.get("/api/sentiment_pie.svg")
def sentiment_pie_svg(limit_width: int = 900, limit_height: int = 560):
    """
    Full-bleed, responsive SVG donut chart showing sentiment distribution.
    Donut geometry is preserved. Right-hand side shows:
      - Total comments (card)
      - Three rounded legend cards with colored dot, label, and count/percent
    """
    global last_comments, last_results

    # compute counts from last_comments (preferred) or last_results
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    if last_comments:
        for c in last_comments:
            try:
                lab, _ = safe_model_predict(c)
            except Exception:
                lab, _ = rule_sentiment(c)
            lab = (lab or "").lower()
            if lab not in counts:
                lab = "neutral"
            counts[lab] += 1
    elif last_results:
        for r in last_results:
            lab = str(r.get("sentiment", "neutral")).lower()
            if lab not in counts:
                lab = "neutral"
            counts[lab] += 1

    total = sum(counts.values())

    # fallback if no data
    if total == 0:
        w = 900; h = 560
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100vh"
                    viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice">
            <rect width="100%" height="100%" fill="#071021"/>
            <text x="{w/2}" y="{h/2}" fill="#9aa7b2" font-size="18" text-anchor="middle" font-family="Inter, Arial">
              No data — upload CSV to see sentiment chart.
            </text>
        </svg>'''
        return Response(content=svg, media_type="image/svg+xml")

    # Canvas and donut geometry (unchanged)
    vw, vh = 1200, 720   # make canvas wider so right column has space
    donut_cx = int(vw * 0.30)
    donut_cy = int(vh * 0.50)
    outer_r = int(min(vw, vh) * 0.28)
    inner_r = int(outer_r * 0.55)

    # Colors
    colors = {"positive": "#4bbf73", "negative": "#ff6b6b", "neutral": "#9aa7b2"}

    import math
    def polar(cx, cy, r, angle_deg):
        a = math.radians(angle_deg)
        return cx + r * math.cos(a), cy + r * math.sin(a)

    # Build slices (donut) - same approach as you already had
    angle_start = -90.0
    slices_svg = []
    labels_svg = []
    for key in ("positive", "negative", "neutral"):
        cnt = counts.get(key, 0)
        frac = cnt / total if total else 0
        angle = frac * 360.0
        angle_end = angle_start + angle

        if cnt > 0 and angle > 0.0001:
            x1, y1 = polar(donut_cx, donut_cy, outer_r, angle_start)
            x2, y2 = polar(donut_cx, donut_cy, outer_r, angle_end)
            large_arc = 1 if angle > 180 else 0
            # outer wedge
            path_outer = f"M {donut_cx:.3f},{donut_cy:.3f} L {x1:.3f},{y1:.3f} A {outer_r},{outer_r} 0 {large_arc} 1 {x2:.3f},{y2:.3f} Z"
            slices_svg.append(f'<path d="{path_outer}" fill="{colors[key]}" stroke="#071021" stroke-width="0.8" />')

            # inner cutout to make it donut (drawn later as center circle)
            mid = angle_start + angle / 2.0
            lx, ly = polar(donut_cx, donut_cy, (outer_r + inner_r) * 0.5, mid)
            pct = f"{int(round(frac * 100))}%"
            labels_svg.append(f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="middle" dominant-baseline="central" font-family="Inter, Arial" font-size="18" fill="#071021" font-weight="700">{pct}</text>')

        angle_start = angle_end

    # Donut center circle + (we will not put text inside; handled right side per request)
    center_circle = f'<circle cx="{donut_cx}" cy="{donut_cy}" r="{inner_r}" fill="#071021" />'

    # RIGHT SIDE: design cards (Total on top, then Positive/Negative/Neutral stacked)
    right_x = int(vw * 0.62)
    card_w = int(vw * 0.34)
    # positions
    total_card_y = int(vh * 0.14)
    legend_start_y = int(vh * 0.30)
    legend_gap = 92
    small_dot_x = right_x + 22
    label_x = right_x + 48
    count_x = right_x + card_w - 36

    # compute percentages (rounded)
    def pct_int(n):
        return int(round((n / total) * 100)) if total else 0

    pos_cnt = counts.get("positive", 0)
    neg_cnt = counts.get("negative", 0)
    neu_cnt = counts.get("neutral", 0)
    pos_pct = pct_int(pos_cnt)
    neg_pct = pct_int(neg_cnt)
    neu_pct = pct_int(neu_cnt)

    # Compose legend cards SVG strings
    right_parts = []

    # total card - rounded translucent rect with small label and big number
    total_card = f'''
      <g>
        <rect x="{right_x}" y="{total_card_y}" rx="12" ry="12" width="{card_w}" height="84"
              fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.03)" />
        <text x="{right_x + 18}" y="{total_card_y + 28}" font-family="Inter, Arial" font-size="13" fill="#9aa7b2">Total comments</text>
        <text x="{right_x + 18}" y="{total_card_y + 58}" font-family="Inter, Arial" font-size="32" font-weight="700" fill="#e6eef6">{total}</text>
        <text x="{count_x}" y="{total_card_y + 58}" font-family="Inter, Arial" font-size="13" fill="#9aa7b2" text-anchor="end">items</text>
      </g>
    '''
    right_parts.append(total_card)

    # legend item helper
    def legend_card(y, color, label, count, pct, idx):
        # color stroke for card: slightly transparent color
        stroke = color
        fill_box = "rgba(0,0,0,0)"  # keep inner transparent to match style
        return f'''
          <g>
            <rect x="{right_x}" y="{y}" rx="12" ry="12" width="{card_w}" height="72"
                  fill="rgba(255,255,255,0.01)" stroke="{stroke}" stroke-opacity="0.16" stroke-width="2" />
            <circle cx="{small_dot_x}" cy="{y + 36}" r="8" fill="{color}" />
            <text x="{label_x}" y="{y + 30}" font-family="Inter, Arial" font-size="18" font-weight="700" fill="#e6eef6">{label}</text>
            <text x="{label_x}" y="{y + 48}" font-family="Inter, Arial" font-size="13" fill="#9aa7b2">{count} comments • {pct}%</text>
          </g>
        '''

    right_parts.append(legend_card(legend_start_y + 0 * legend_gap, colors["positive"], "Positive", pos_cnt, pos_pct, 0))
    right_parts.append(legend_card(legend_start_y + 1 * legend_gap, colors["negative"], "Negative", neg_cnt, neg_pct, 1))
    right_parts.append(legend_card(legend_start_y + 2 * legend_gap, colors["neutral"], "Neutral", neu_cnt, neu_pct, 2))

    # footer credit
    footer = f'<text x="{vw - 12}" y="{vh - 12}" text-anchor="end" font-family="Inter, Arial" font-size="11" fill="#7b8794">Generated by eConsult Insight</text>'

    # put everything together
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100vh" viewBox="0 0 {vw} {vh}" preserveAspectRatio="xMidYMid slice">',
        '<style>',
        '  text{font-family:Inter, Arial, Helvetica, sans-serif;shape-rendering:geometricPrecision;}',
        '</style>',
        # background gradient + vignette
        '<defs>',
        '  <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">',
        '    <stop offset="0%" stop-color="#071722" />',
        '    <stop offset="100%" stop-color="#041018" />',
        '  </linearGradient>',
        '</defs>',
        f'<rect width="100%" height="100%" fill="url(#bg)"/>',
        # donut slices group
        "<g>",
        "\n".join(slices_svg),
        center_circle,
        # percent labels inside slices (already built)
        "\n".join(labels_svg),
        "</g>",
        # right hand cards
        "\n".join(right_parts),
        # footer
        footer,
        "</svg>"
    ]

    svg = "\n".join(svg_parts)
    return Response(content=svg, media_type="image/svg+xml")
# ----------------------------
# Allow the frontend to set comments directly (already present in your app)
@app.post("/api/set_comments")
async def set_comments(payload: dict = Body(...)):
    global last_comments
    comments = payload.get("comments")
    if not isinstance(comments, list):
        raise HTTPException(status_code=400, detail="Expecting JSON body with 'comments' list.")
    last_comments = [str(c) for c in comments if c is not None]
    return {"set": len(last_comments)}

# ----------------------------
# Basic trend endpoints (JSON + simple SVG) — used earlier in conversation
@app.get("/api/sentiment_trend_data")
def sentiment_trend_data(limit: int = 40):
    pts = trend_points[-limit:]
    return {"points": pts, "count": len(pts)}

@app.get("/api/sentiment_trend_chart")
def sentiment_trend_chart(limit: int = 40, width: int = 900, height: int = 320):
    pts = trend_points[-limit:]
    if not pts:
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><rect width="100%" height="100%" fill="#071225"/><text x="{width/2}" y="{height/2}" fill="#9aa7b2" text-anchor="middle" font-family="Arial" font-size="14">No trend data yet</text></svg>'
        return Response(content=svg, media_type="image/svg+xml")

    times = [p["time"] for p in pts]
    pos_vals = [p["positive"] for p in pts]
    neu_vals = [p["neutral"] for p in pts]
    neg_vals = [p["negative"] for p in pts]
    max_y = max(max(pos_vals or [0]), max(neu_vals or [0]), max(neg_vals or [0]), 1)

    left_m, right_m, top_m, bottom_m = 50, 20, 20, 40
    plot_w = width - left_m - right_m
    plot_h = height - top_m - bottom_m
    n = len(pts)
    def x_at(i):
        if n == 1:
            return left_m + plot_w/2
        return left_m + (i * (plot_w) / (n-1))
    def y_at(val):
        return top_m + (plot_h * (1 - (val / max_y)))
    def polyline(vals):
        return " ".join(f"{x_at(i)},{y_at(v)}" for i,v in enumerate(vals))
    pos_path = polyline(pos_vals)
    neu_path = polyline(neu_vals)
    neg_path = polyline(neg_vals)

    svg_parts = []
    svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">')
    svg_parts.append(f'<rect width="100%" height="100%" fill="#071225"/>')
    for i in range(5):
        y = top_m + i * (plot_h/4)
        svg_parts.append(f'<line x1="{left_m}" y1="{y}" x2="{width-right_m}" y2="{y}" stroke="#0b1720" stroke-width="1"/>')
    svg_parts.append(f'<polyline points="{pos_path}" fill="none" stroke="#4bbf73" stroke-width="3" />')
    svg_parts.append(f'<polyline points="{neu_path}" fill="none" stroke="#9aa7b2" stroke-width="3" />')
    svg_parts.append(f'<polyline points="{neg_path}" fill="none" stroke="#ff6b6b" stroke-width="3" />')
    for i in range(n):
        svg_parts.append(f'<circle cx="{x_at(i)}" cy="{y_at(pos_vals[i])}" r="3" fill="#4bbf73"/>')
        svg_parts.append(f'<circle cx="{x_at(i)}" cy="{y_at(neu_vals[i])}" r="3" fill="#9aa7b2"/>')
        svg_parts.append(f'<circle cx="{x_at(i)}" cy="{y_at(neg_vals[i])}" r="3" fill="#ff6b6b"/>')
    label_count = min(6, n)
    step = max(1, math.floor((n-1)/(label_count-1))) if label_count>1 else 1
    for i in range(0, n, step):
        t = times[i]
        lbl = t.replace("T"," ").split("+")[0]
        svg_parts.append(f'<text x="{x_at(i)}" y="{height-8}" font-family="Arial" font-size="10" fill="#9aa7b2" text-anchor="middle">{html.escape(lbl)}</text>')
    lgx = left_m + 8
    lgy = top_m - 6
    svg_parts.append(f'<circle cx="{lgx+6}" cy="{lgy}" r="5" fill="#4bbf73"/><text x="{lgx+18}" y="{lgy+4}" font-size="11" font-family="Arial" fill="#9aa7b2">Positive</text>')
    svg_parts.append(f'<circle cx="{lgx+90}" cy="{lgy}" r="5" fill="#9aa7b2"/><text x="{lgx+102}" y="{lgy+4}" font-size="11" font-family="Arial" fill="#9aa7b2">Neutral</text>')
    svg_parts.append(f'<circle cx="{lgx+170}" cy="{lgy}" r="5" fill="#ff6b6b"/><text x="{lgx+182}" y="{lgy+4}" font-size="11" font-family="Arial" fill="#9aa7b2">Negative</text>')
    svg_parts.append(f'<text x="{width-12}" y="{height-8}" font-family="Arial" font-size="11" fill="#7b8794" text-anchor="end">Generated by eConsult Insight</text>')
    svg_parts.append('</svg>')
    svg = "\n".join(svg_parts)
    return Response(content=svg, media_type="image/svg+xml")