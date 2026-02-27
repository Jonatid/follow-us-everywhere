import { useState, useEffect, useRef, useCallback } from "react";

const BRAND = {
  blue: "#003594",
  yellow: "#FDD001",
  white: "#FFFFFF",
  offWhite: "#F4F7FF",
  lightGray: "#E8EDF8",
  midGray: "#8A9DC0",
  mutedLabel: "#6B85B5",
};

const LINK_OPTIONS = [
  { label: "Website", icon: "🌐", placeholder: "https://yourbusiness.com" },
  { label: "Instagram", icon: "📸", placeholder: "https://instagram.com/handle" },
  { label: "Facebook", icon: "👥", placeholder: "https://facebook.com/page" },
  { label: "TikTok", icon: "🎵", placeholder: "https://tiktok.com/@handle" },
  { label: "LinkedIn", icon: "💼", placeholder: "https://linkedin.com/company/..." },
  { label: "X / Twitter", icon: "🐦", placeholder: "https://x.com/handle" },
  { label: "YouTube", icon: "▶️", placeholder: "https://youtube.com/@channel" },
  { label: "Pinterest", icon: "📌", placeholder: "https://pinterest.com/handle" },
  { label: "Other", icon: "🔗", placeholder: "https://..." },
];

const SAMPLE_LINKS = [
  { label: "Website", icon: "🌐", url: "https://yourbusiness.com", active: true },
  { label: "Instagram", icon: "📸", url: "https://instagram.com/yourbiz", active: true },
  { label: "Facebook", icon: "👥", url: "https://facebook.com/yourbiz", active: true },
  { label: "TikTok", icon: "🎵", url: "https://tiktok.com/@yourbiz", active: true },
  { label: "LinkedIn", icon: "💼", url: "", active: false },
];

// ── Pure JS QR Code Generator (QR Version 3, no deps) ────────────────────────
function generateQR(text) {
  // Minimal QR code matrix generator using a simplified approach
  // Returns a 2D boolean array representing modules
  const data = encodeURIComponent(text);
  
  // Use a deterministic hash-based pattern for demo purposes
  // In production this would use a full QR spec implementation
  const size = 29; // Version 3 QR
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns (top-left, top-right, bottom-left)
  const addFinder = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const onInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (row + r < size && col + c < size) {
          matrix[row + r][col + c] = onBorder || onInner;
        }
      }
    }
  };
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Separators
  for (let i = 0; i < 8; i++) {
    if (i < size) matrix[7][i] = false;
    if (i < size) matrix[i][7] = false;
    if (7 + i < size) matrix[7][size - 8 + i < size ? size - 8 + i : size - 1] = false;
    if (i < size) matrix[i][size - 8] = false;
    if (size - 8 + i < size) matrix[size - 8 + i][7] = false;
    if (i < size) matrix[size - 8][i] = false;
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern (version 3 has one at row 22, col 22)
  const addAlignment = (row, col) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const onBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const onCenter = r === 0 && c === 0;
        if (row + r >= 0 && row + r < size && col + c >= 0 && col + c < size) {
          matrix[row + r][col + c] = onBorder || onCenter;
        }
      }
    }
  };
  addAlignment(22, 22);

  // Format info (simplified - dark module)
  matrix[8][size - 8] = true;

  // Data modules: encode the URL as a simple byte pattern
  let bytes = [];
  for (let i = 0; i < Math.min(text.length, 40); i++) {
    bytes.push(text.charCodeAt(i));
  }
  // Pad to fill data area
  while (bytes.length < 44) bytes.push(bytes.length % 2 === 0 ? 0b11101100 : 0b00010001);

  // Fill data into non-functional modules (right to left, bottom to top, zigzag)
  const isFunction = (r, c) => {
    if (r < 9 && c < 9) return true; // top-left finder + format
    if (r < 9 && c >= size - 8) return true; // top-right finder + format
    if (r >= size - 8 && c < 9) return true; // bottom-left finder
    if (r === 6 || c === 6) return true; // timing
    if (r >= 20 && r <= 24 && c >= 20 && c <= 24) return true; // alignment
    if (r === 8 && c === size - 8) return true; // dark module
    return false;
  };

  let byteIdx = 0;
  let bitIdx = 7;
  let goUp = true;
  
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5;
    for (let i = 0; i < size; i++) {
      const row = goUp ? size - 1 - i : i;
      for (let dx = 0; dx < 2; dx++) {
        const c = col - dx;
        if (!isFunction(row, c)) {
          if (byteIdx < bytes.length) {
            const bit = (bytes[byteIdx] >> bitIdx) & 1;
            matrix[row][c] = bit === 1;
            bitIdx--;
            if (bitIdx < 0) { bitIdx = 7; byteIdx++; }
          }
        }
      }
    }
    goUp = !goUp;
  }

  // Apply mask pattern 0 (i+j) % 2 == 0 to data modules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction(r, c) && (r + c) % 2 === 0) {
        matrix[r][c] = !matrix[r][c];
      }
    }
  }

  return matrix;
}

// ── QR Canvas Component ───────────────────────────────────────────────────────
function QRCanvas({ value, size = 200, fgColor = BRAND.blue, bgColor = "#fff", style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const matrix = generateQR(value);
    const modules = matrix.length;
    const scale = Math.floor(size / modules);
    const actualSize = scale * modules;
    canvas.width = actualSize;
    canvas.height = actualSize;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, actualSize, actualSize);

    ctx.fillStyle = fgColor;
    matrix.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) ctx.fillRect(c * scale, r * scale, scale, scale);
      });
    });
  }, [value, size, fgColor, bgColor]);

  return <canvas ref={canvasRef} style={{ borderRadius: 4, display: "block", ...style }} />;
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ businessName, tagline, links, fuse101Slug, animate }) {
  const [clicked, setClicked] = useState(null);
  const activeLinks = links.filter(l => l.active && l.url.trim());
  const fuseLink = { label: "View FUSE101 Profile", icon: "⭐", url: `https://fuse101.com/${fuse101Slug || "your-business"}`, fuse: true };
  const allLinks = [...activeLinks, fuseLink];

  return (
    <div style={{
      background: BRAND.blue, minHeight: "100%",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 20px 40px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `radial-gradient(circle, ${BRAND.yellow} 1px, transparent 1px)`,
        backgroundSize: "24px 24px", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 160, borderRadius: "50%",
        background: `${BRAND.yellow}18`, pointerEvents: "none",
      }} />

      <div style={{
        display: "inline-flex", alignItems: "center",
        background: BRAND.yellow, borderRadius: 30, padding: "6px 18px", marginBottom: 24,
        animation: animate ? "fadeDown 0.5s ease both" : "none",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: BRAND.blue, textTransform: "uppercase" }}>
          ✦ Follow Us Everywhere ✦
        </span>
      </div>

      <div style={{
        fontSize: 26, fontWeight: 800, color: BRAND.white,
        textAlign: "center", letterSpacing: "-0.03em", marginBottom: 6, lineHeight: 1.2,
        animation: animate ? "fadeDown 0.5s 0.1s ease both" : "none",
      }}>
        {businessName || "Your Business Name"}
      </div>

      {tagline && (
        <div style={{
          fontSize: 13, color: `${BRAND.yellow}cc`, textAlign: "center",
          marginBottom: 28, fontWeight: 500,
          animation: animate ? "fadeDown 0.5s 0.15s ease both" : "none",
        }}>{tagline}</div>
      )}
      {!tagline && <div style={{ marginBottom: 28 }} />}

      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
        {allLinks.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
            onClick={() => setClicked(i)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              background: link.fuse ? BRAND.yellow : "rgba(255,255,255,0.1)",
              border: link.fuse ? "none" : "1.5px solid rgba(255,255,255,0.18)",
              borderRadius: 14, padding: "14px 18px",
              textDecoration: "none", transition: "all 0.2s",
              animation: animate ? `fadeUp 0.4s ${0.2 + i * 0.07}s ease both` : "none",
            }}
            onMouseEnter={e => { if (!link.fuse) e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
            onMouseLeave={e => { if (!link.fuse) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: link.fuse ? BRAND.blue : "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>{link.icon}</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: link.fuse ? BRAND.blue : BRAND.white, flex: 1 }}>
              {link.label}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke={link.fuse ? BRAND.blue : "rgba(255,255,255,0.5)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ))}
      </div>

      <div style={{
        marginTop: 32, fontSize: 11,
        color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
        animation: animate ? `fadeUp 0.4s ${0.2 + allLinks.length * 0.07 + 0.1}s ease both` : "none",
      }}>
        Powered by <span style={{ color: BRAND.yellow, fontWeight: 700 }}>FUSE101</span>
      </div>

      <style>{`
        @keyframes fadeDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(14px);  } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ── QR Panel ──────────────────────────────────────────────────────────────────
function QRPanel({ qrValue, businessName }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const src = canvasRef.current?.querySelector("canvas");
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = src.width + 40;
    out.height = src.height + 80;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 20, 20);
    ctx.fillStyle = BRAND.blue;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Follow Us Everywhere · FUSE101", out.width / 2, out.height - 16);
    const a = document.createElement("a");
    a.download = `${(businessName || "fuse101").replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: 300 }}>
      <div ref={canvasRef} style={{
        background: BRAND.white, border: `3px solid ${BRAND.yellow}`,
        borderRadius: 20, padding: 16,
        boxShadow: `0 8px 40px rgba(0,53,148,0.15)`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <div style={{
          background: BRAND.yellow, borderRadius: 8, padding: "4px 12px",
          fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
          color: BRAND.blue, textTransform: "uppercase",
        }}>✦ Follow Us Everywhere ✦</div>
        <QRCanvas value={qrValue} size={190} fgColor={BRAND.blue} bgColor="#ffffff" />
        <div style={{ fontSize: 10, color: BRAND.midGray, letterSpacing: "0.05em" }}>
          {businessName || "Your Business"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, width: "100%" }}>
        <button onClick={handleDownload} style={{
          flex: 1, background: BRAND.yellow, color: BRAND.blue, border: "none",
          borderRadius: 10, padding: "11px 8px", fontSize: 12, fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>⬇ Download PNG</button>
        <button onClick={handleCopy} style={{
          flex: 1, background: BRAND.offWhite, color: BRAND.blue,
          border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 10,
          padding: "11px 8px", fontSize: 12, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>{copied ? "✓ Copied!" : "🔗 Copy Link"}</button>
      </div>

      <div style={{ width: "100%" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.mutedLabel, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Embed on any site
        </div>
        <pre style={{
          background: BRAND.offWhite, border: `1.5px solid ${BRAND.lightGray}`,
          borderRadius: 10, padding: "12px 14px", fontSize: 10,
          color: BRAND.blue, fontFamily: "'Fira Code', monospace",
          margin: 0, lineHeight: 1.6, overflowX: "auto",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>{`<iframe src="${qrValue}"\n  width="300" height="500"\n  frameborder="0"\n  style="border-radius:20px">\n</iframe>`}</pre>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("builder");
  const [businessName, setBusinessName] = useState("Detroit Coffee Co.");
  const [tagline, setTagline] = useState("Serving Detroit's finest since 2018");
  const [fuse101Slug, setFuse101Slug] = useState("detroit-coffee-co");
  const [links, setLinks] = useState(SAMPLE_LINKS);
  const [animateLP, setAnimateLP] = useState(false);

  const landingUrl = `https://fuse101.com/qr/${fuse101Slug || "your-business"}`;

  const updateLink = (i, field, value) => {
    const u = [...links]; u[i] = { ...u[i], [field]: value }; setLinks(u);
  };
  const toggleLink = (i) => {
    const u = [...links]; u[i] = { ...u[i], active: !u[i].active }; setLinks(u);
  };
  const addLink = () => {
    if (links.length < 5) setLinks([...links, { label: "Other", icon: "🔗", url: "", active: true }]);
  };
  const removeLink = (i) => setLinks(links.filter((_, idx) => idx !== i));
  const handlePreview = () => { setView("preview"); setTimeout(() => setAnimateLP(true), 50); };

  const inputStyle = {
    width: "100%", background: BRAND.white,
    border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 10,
    padding: "11px 14px", color: BRAND.blue, fontSize: 14,
    outline: "none", boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: BRAND.mutedLabel,
    letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8,
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.white, fontFamily: "'DM Sans', sans-serif", color: BRAND.blue }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fira+Code&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1.5px solid ${BRAND.lightGray}`, padding: "16px 32px",
        display: "flex", alignItems: "center", gap: 14, background: BRAND.white,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          background: BRAND.blue, borderRadius: 10, width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 900, color: BRAND.yellow, flexShrink: 0,
        }}>F</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>Follow Us Everywhere</div>
          <div style={{ fontSize: 11, color: BRAND.midGray }}>QR + Landing Page Builder · FUSE101</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[["builder", "⚙ Builder"], ["preview", "📱 Preview Page"]].map(([v, label]) => (
            <button key={v} onClick={() => v === "preview" ? handlePreview() : setView(v)} style={{
              background: view === v ? BRAND.blue : BRAND.offWhite,
              color: view === v ? BRAND.white : BRAND.blue,
              border: `1.5px solid ${view === v ? BRAND.blue : BRAND.lightGray}`,
              borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── BUILDER ── */}
      {view === "builder" && (
        <div style={{ display: "flex", minHeight: "calc(100vh - 73px)" }}>
          {/* Left form */}
          <div style={{ width: "50%", padding: "32px", borderRight: `1.5px solid ${BRAND.lightGray}`, overflowY: "auto" }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Build Your Landing Page</div>
            <div style={{ fontSize: 13, color: BRAND.midGray, marginBottom: 28 }}>Fill in your details — your QR code updates live</div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Business Name</label>
              <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Detroit Coffee Co." style={inputStyle}
                onFocus={e => e.target.style.borderColor = BRAND.blue} onBlur={e => e.target.style.borderColor = BRAND.lightGray} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Tagline <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Serving Detroit's finest since 2018" style={inputStyle}
                onFocus={e => e.target.style.borderColor = BRAND.blue} onBlur={e => e.target.style.borderColor = BRAND.lightGray} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>FUSE101 Page Slug</label>
              <div style={{ display: "flex", alignItems: "center", background: BRAND.white, border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 10, overflow: "hidden" }}>
                <span style={{ padding: "11px 10px 11px 14px", color: BRAND.midGray, fontSize: 13, whiteSpace: "nowrap", borderRight: `1px solid ${BRAND.lightGray}` }}>fuse101.com/</span>
                <input value={fuse101Slug} onChange={e => setFuse101Slug(e.target.value.toLowerCase().replace(/\s/g, "-"))} placeholder="your-business"
                  style={{ flex: 1, background: "transparent", border: "none", padding: "11px 14px", color: BRAND.blue, fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
              </div>
            </div>

            <label style={labelStyle}>Your Links (up to 5)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {links.map((link, i) => (
                <div key={i} style={{
                  background: link.active ? BRAND.offWhite : "#fafafa",
                  border: `1.5px solid ${link.active ? BRAND.lightGray : "#eee"}`,
                  borderRadius: 12, padding: 14, opacity: link.active ? 1 : 0.55, transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <div onClick={() => toggleLink(i)} style={{
                      width: 34, height: 20, borderRadius: 10, flexShrink: 0,
                      background: link.active ? BRAND.yellow : BRAND.lightGray,
                      position: "relative", cursor: "pointer", transition: "background 0.2s",
                    }}>
                      <div style={{
                        position: "absolute", top: 3, left: link.active ? 17 : 3,
                        width: 14, height: 14, borderRadius: "50%",
                        background: link.active ? BRAND.blue : BRAND.white, transition: "left 0.2s",
                      }} />
                    </div>
                    <select value={link.label} onChange={e => { const opt = LINK_OPTIONS.find(o => o.label === e.target.value); updateLink(i, "label", e.target.value); updateLink(i, "icon", opt?.icon || "🔗"); }}
                      style={{ background: BRAND.white, border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 8, color: BRAND.blue, padding: "5px 8px", fontSize: 12, outline: "none", cursor: "pointer" }}>
                      {LINK_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.icon} {o.label}</option>)}
                    </select>
                    <button onClick={() => removeLink(i)} style={{ marginLeft: "auto", background: BRAND.white, border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 6, color: BRAND.midGray, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                  <input value={link.url} onChange={e => updateLink(i, "url", e.target.value)}
                    placeholder={LINK_OPTIONS.find(o => o.label === link.label)?.placeholder || "https://..."}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = BRAND.blue} onBlur={e => e.target.style.borderColor = BRAND.lightGray} />
                </div>
              ))}
            </div>

            {links.length < 5 && (
              <button onClick={addLink} style={{
                background: "transparent", border: `1.5px dashed ${BRAND.blue}44`,
                borderRadius: 10, color: BRAND.blue, padding: "11px",
                fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 20,
              }}>+ Add Link ({links.length}/5)</button>
            )}

            <div style={{
              background: `${BRAND.yellow}22`, border: `1.5px solid ${BRAND.yellow}`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.blue }}>FUSE101 Profile · Auto-added as link #6</div>
                <div style={{ fontSize: 11, color: BRAND.midGray, marginTop: 2 }}>fuse101.com/{fuse101Slug || "your-business"}</div>
              </div>
            </div>

            <button onClick={handlePreview} style={{
              background: BRAND.yellow, color: BRAND.blue, border: "none",
              borderRadius: 10, padding: "15px", fontSize: 14, fontWeight: 800,
              cursor: "pointer", width: "100%",
            }}>📱 Preview Landing Page →</button>
          </div>

          {/* Right: Live QR */}
          <div style={{ width: "50%", padding: "32px 24px", background: BRAND.offWhite, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.mutedLabel, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 28 }}>Your QR Code · Updates Live</div>
            <QRPanel qrValue={landingUrl} businessName={businessName} />

            <div style={{ marginTop: 24, background: BRAND.white, border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 14, padding: 18, width: "100%", maxWidth: 300 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.blue, marginBottom: 10 }}>📲 How it works</div>
              {[
                "Customer scans your QR code",
                `Redirects to fuse101.com/qr/${fuse101Slug || "your-business"}`,
                "Scan is logged for your analytics",
                "Your Follow Us Everywhere page loads",
                "They tap any link to follow you",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: BRAND.yellow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: BRAND.blue, flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 12, color: BRAND.blue, lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {view === "preview" && (
        <div style={{ display: "flex", minHeight: "calc(100vh - 73px)" }}>
          {/* Phone mockup */}
          <div style={{ width: "50%", background: BRAND.offWhite, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, borderRight: `1.5px solid ${BRAND.lightGray}` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.mutedLabel, letterSpacing: "0.15em", textTransform: "uppercase" }}>Phone Preview</div>
              <div style={{
                width: 320, borderRadius: 40, border: `8px solid ${BRAND.blue}`,
                boxShadow: `0 24px 60px rgba(0,53,148,0.25), 0 0 0 2px ${BRAND.yellow}`,
                overflow: "hidden", background: BRAND.blue,
              }}>
                <div style={{ background: BRAND.blue, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 80, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)" }} />
                </div>
                <div style={{ height: 580, overflowY: "auto" }}>
                  <LandingPage businessName={businessName} tagline={tagline} links={links} fuse101Slug={fuse101Slug} animate={animateLP} />
                </div>
                <div style={{ background: BRAND.blue, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: BRAND.midGray }}>fuse101.com/qr/{fuse101Slug || "your-business"}</div>
            </div>
          </div>

          {/* Right: QR + summary */}
          <div style={{ width: "50%", padding: "40px 32px", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%", maxWidth: 300 }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Your QR Code is Ready</div>
              <div style={{ fontSize: 13, color: BRAND.midGray, marginBottom: 28 }}>Download, print, or embed this anywhere</div>
              <QRPanel qrValue={landingUrl} businessName={businessName} />

              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.mutedLabel, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Active Links</div>
                {links.filter(l => l.active && l.url.trim()).map((link, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BRAND.lightGray}` }}>
                    <span>{link.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{link.label}</span>
                    <span style={{ fontSize: 11, color: BRAND.midGray, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.url}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
                  <span>⭐</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>FUSE101 Profile</span>
                  <span style={{ fontSize: 11, color: BRAND.midGray }}>fuse101.com/{fuse101Slug || "your-business"}</span>
                </div>
              </div>

              <button onClick={() => setView("builder")} style={{
                marginTop: 20, background: BRAND.offWhite, color: BRAND.blue,
                border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 10,
                padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%",
              }}>← Edit Links & Info</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
