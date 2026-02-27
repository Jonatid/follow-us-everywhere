import { useState, useEffect, useRef } from "react";

const BRAND = {
  blue: "#003594",
  yellow: "#FDD001",
  white: "#FFFFFF",
  offWhite: "#F4F7FF",
  lightGray: "#E8EDF8",
  midGray: "#8A9DC0",
  yellowLight: "#FFF8CC",
};

const LINK_OPTIONS = [
  { label: "Website", icon: "🌐", placeholder: "https://yourbusiness.com" },
  { label: "Instagram", icon: "📸", placeholder: "https://instagram.com/handle" },
  { label: "Facebook", icon: "👥", placeholder: "https://facebook.com/page" },
  { label: "TikTok", icon: "🎵", placeholder: "https://tiktok.com/@handle" },
  { label: "LinkedIn", icon: "💼", placeholder: "https://linkedin.com/company/..." },
  { label: "X / Twitter", icon: "🐦", placeholder: "https://x.com/handle" },
  { label: "YouTube", icon: "▶️", placeholder: "https://youtube.com/channel/..." },
  { label: "Pinterest", icon: "📌", placeholder: "https://pinterest.com/handle" },
  { label: "Other", icon: "🔗", placeholder: "https://..." },
];

const DISPLAY_MODES = [
  { id: "minimal", label: "Minimal", desc: "Just the QR code" },
  { id: "branded", label: "Branded", desc: "QR + name + FUSE branding" },
  { id: "full", label: "Full", desc: "QR + all links listed" },
  { id: "custom", label: "Custom", desc: "You choose each element" },
];

function QRPlaceholder({ size = 140 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = size;
    canvas.height = size;
    const s = size;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, s, s);
    const cellSize = s / 21;
    const pattern = [
      [1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,0,0,1,1,0,0,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
      [1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1,0,1],
      [0,1,1,0,0,1,0,0,1,0,0,1,0,1,1,0,1,0,0,1,0],
      [1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],
      [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],
      [1,1,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,1,1],
      [0,0,0,0,0,0,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0],
      [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,0],
      [1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,0,1,1,0,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,0,1,0,1,0,0,1,0,0],
      [1,0,1,1,1,0,1,0,0,1,1,1,0,1,1,0,1,0,0,1,0],
      [1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,1,0,0,1],
      [1,1,1,1,1,1,1,0,0,1,0,1,0,1,1,0,1,0,1,0,0],
    ];
    ctx.fillStyle = BRAND.blue;
    pattern.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      });
    });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(s * 0.38, s * 0.38, s * 0.24, s * 0.24);
    ctx.fillStyle = BRAND.yellow;
    ctx.fillRect(s * 0.41, s * 0.41, s * 0.18, s * 0.18);
    ctx.fillStyle = BRAND.blue;
    ctx.font = `bold ${s * 0.09}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F", s * 0.5, s * 0.5);
  }, [size]);
  return <canvas ref={canvasRef} style={{ borderRadius: 8, display: "block" }} />;
}

function WidgetPreview({ config }) {
  const { businessName, links, displayMode, customOptions } = config;
  const showQR = displayMode !== "custom" || customOptions.qr;
  const showName = ["branded","full"].includes(displayMode) || (displayMode === "custom" && customOptions.name);
  const showBranding = ["branded","full"].includes(displayMode) || (displayMode === "custom" && customOptions.branding);
  const showLinks = displayMode === "full" || (displayMode === "custom" && customOptions.links);
  const activeLinks = links.filter(l => l.url.trim());
  const fuseLink = { label: "FUSE101 Profile", icon: "⭐" };

  return (
    <div style={{
      background: BRAND.blue,
      border: `3px solid ${BRAND.yellow}`,
      borderRadius: 20, padding: 24,
      width: "100%", maxWidth: 280, margin: "0 auto",
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: `0 8px 40px rgba(0,53,148,0.2)`,
    }}>
      {showBranding && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{
            display: "inline-block", background: BRAND.yellow,
            borderRadius: 20, padding: "5px 14px",
            fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
            color: BRAND.blue, textTransform: "uppercase",
          }}>✦ Follow Us Everywhere ✦</div>
        </div>
      )}
      {showName && (
        <div style={{ textAlign: "center", fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
          {businessName || "Your Business Name"}
        </div>
      )}
      {showQR && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ background: "#fff", padding: 10, borderRadius: 14, border: `3px solid ${BRAND.yellow}` }}>
            <QRPlaceholder size={130} />
          </div>
        </div>
      )}
      {showLinks && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...activeLinks, fuseLink].map((link, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: i === activeLinks.length ? BRAND.yellow : "rgba(255,255,255,0.12)",
              border: i === activeLinks.length ? "none" : "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10, padding: "9px 14px", cursor: "pointer",
            }}>
              <span style={{ fontSize: 14 }}>{link.icon}</span>
              <span style={{ fontSize: 12, color: i === activeLinks.length ? BRAND.blue : "#fff", fontWeight: 700 }}>{link.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: i === activeLinks.length ? BRAND.blue : "rgba(255,255,255,0.4)" }}>→</span>
            </div>
          ))}
        </div>
      )}
      {!showLinks && (
        <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          Scan to connect with us
        </div>
      )}
      {showBranding && (
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
          Powered by <span style={{ color: BRAND.yellow, fontWeight: 700 }}>FUSE101</span>
        </div>
      )}
    </div>
  );
}

function EmbedCode({ displayMode }) {
  const [copied, setCopied] = useState(false);
  const code = `<iframe\n  src="https://fuse101.com/widget/qr/your-id?mode=${displayMode}"\n  width="300" height="400"\n  frameborder="0"\n  style="border-radius:20px;"\n></iframe>`;
  return (
    <div style={{ position: "relative" }}>
      <pre style={{
        background: BRAND.offWhite, border: `1.5px solid ${BRAND.lightGray}`,
        borderRadius: 10, padding: 14, fontSize: 11,
        color: BRAND.blue, fontFamily: "'Fira Code', monospace",
        overflowX: "auto", margin: 0, lineHeight: 1.6,
      }}>{code}</pre>
      <button
        onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{
          position: "absolute", top: 8, right: 8,
          background: copied ? BRAND.lightGray : BRAND.yellow,
          color: BRAND.blue, border: "none", borderRadius: 6,
          padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}
      >{copied ? "Copied!" : "Copy"}</button>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [links, setLinks] = useState([
    { label: "Website", icon: "🌐", url: "", active: true },
    { label: "Instagram", icon: "📸", url: "", active: true },
    { label: "Facebook", icon: "👥", url: "", active: true },
    { label: "TikTok", icon: "🎵", url: "", active: false },
    { label: "LinkedIn", icon: "💼", url: "", active: false },
  ]);
  const [displayMode, setDisplayMode] = useState("branded");
  const [customOptions, setCustomOptions] = useState({ qr: true, name: true, branding: true, links: true });

  const addLink = () => {
    if (links.length < 5) setLinks([...links, { label: "Other", icon: "🔗", url: "", active: true }]);
  };
  const updateLink = (i, field, value) => {
    const updated = [...links];
    updated[i] = { ...updated[i], [field]: value };
    setLinks(updated);
  };
  const removeLink = (i) => setLinks(links.filter((_, idx) => idx !== i));

  const config = { businessName, links: links.filter(l => l.active), displayMode, customOptions };

  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: "#6B85B5",
    letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8,
  };
  const inputStyle = {
    width: "100%", background: BRAND.white,
    border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 10,
    padding: "11px 14px", color: BRAND.blue, fontSize: 14,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
    fontFamily: "'DM Sans', sans-serif",
  };
  const primaryBtn = {
    background: BRAND.yellow, color: BRAND.blue,
    border: "none", borderRadius: 10, padding: "14px 28px",
    fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%",
  };
  const secondaryBtn = {
    background: BRAND.offWhite, color: BRAND.blue,
    border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 10,
    padding: "14px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.white, color: BRAND.blue, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fira+Code&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1.5px solid ${BRAND.lightGray}`, padding: "18px 32px",
        display: "flex", alignItems: "center", gap: 16, background: BRAND.white,
      }}>
        <div style={{
          background: BRAND.blue, borderRadius: 10, width: 42, height: 42,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 900, color: BRAND.yellow, flexShrink: 0,
        }}>F</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: BRAND.blue }}>
            Follow Us Everywhere
          </div>
          <div style={{ fontSize: 12, color: BRAND.midGray, marginTop: 1 }}>QR Widget Builder by FUSE101</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {[1, 2, 3].map(s => (
            <div key={s} onClick={() => setStep(s)} style={{
              width: 30, height: 30, borderRadius: "50%",
              background: step >= s ? BRAND.yellow : BRAND.offWhite,
              border: `2px solid ${step >= s ? BRAND.yellow : BRAND.lightGray}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800,
              color: step >= s ? BRAND.blue : BRAND.midGray,
              cursor: "pointer", transition: "all 0.3s",
            }}>{s}</div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 79px)" }}>

        {/* Left Panel */}
        <div style={{
          width: "55%", padding: "32px",
          borderRight: `1.5px solid ${BRAND.lightGray}`,
          overflowY: "auto", background: BRAND.white,
        }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6, color: BRAND.blue }}>
                Business Info
              </div>
              <div style={{ fontSize: 13, color: BRAND.midGray, marginBottom: 28 }}>
                Set up your business identity for the widget
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Business Name</label>
                <input
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Detroit Coffee Co."
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = BRAND.blue}
                  onBlur={e => e.target.style.borderColor = BRAND.lightGray}
                />
              </div>

              <div style={{
                background: BRAND.offWhite, border: `1.5px solid ${BRAND.lightGray}`,
                borderRadius: 12, padding: 18, marginBottom: 28,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.blue, marginBottom: 6 }}>
                  ⭐ Already on FUSE101?
                </div>
                <div style={{ fontSize: 12, color: BRAND.midGray, marginBottom: 14, lineHeight: 1.6 }}>
                  Your FUSE101 profile is automatically added as the 6th link on your widget — no setup needed.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{
                    background: BRAND.blue, color: BRAND.white, border: "none",
                    borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", flex: 1,
                  }}>Log In to FUSE101</button>
                  <button style={{
                    background: BRAND.white, color: BRAND.blue,
                    border: `1.5px solid ${BRAND.lightGray}`,
                    borderRadius: 8, padding: "9px 14px", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", flex: 1,
                  }}>Create Free Page</button>
                </div>
              </div>

              <button onClick={() => setStep(2)} style={primaryBtn}>
                Next: Add Your Links →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6, color: BRAND.blue }}>
                Your Links
              </div>
              <div style={{ fontSize: 13, color: BRAND.midGray, marginBottom: 28 }}>
                Add up to 5 links — your FUSE101 profile is automatically added as the 6th
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {links.map((link, i) => (
                  <div key={i} style={{
                    background: BRAND.offWhite, border: `1.5px solid ${BRAND.lightGray}`,
                    borderRadius: 12, padding: 14,
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      <select
                        value={link.label}
                        onChange={e => {
                          const opt = LINK_OPTIONS.find(o => o.label === e.target.value);
                          updateLink(i, "label", e.target.value);
                          updateLink(i, "icon", opt?.icon || "🔗");
                        }}
                        style={{
                          background: BRAND.white, border: `1.5px solid ${BRAND.lightGray}`,
                          borderRadius: 8, color: BRAND.blue, padding: "6px 10px",
                          fontSize: 12, outline: "none", cursor: "pointer",
                        }}
                      >
                        {LINK_OPTIONS.map(o => (
                          <option key={o.label} value={o.label}>{o.icon} {o.label}</option>
                        ))}
                      </select>
                      <button onClick={() => removeLink(i)} style={{
                        marginLeft: "auto", background: BRAND.white,
                        border: `1.5px solid ${BRAND.lightGray}`, borderRadius: 6,
                        color: BRAND.midGray, padding: "4px 8px", fontSize: 11, cursor: "pointer",
                      }}>✕</button>
                    </div>
                    <input
                      value={link.url}
                      onChange={e => updateLink(i, "url", e.target.value)}
                      placeholder={LINK_OPTIONS.find(o => o.label === link.label)?.placeholder || "https://..."}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = BRAND.blue}
                      onBlur={e => e.target.style.borderColor = BRAND.lightGray}
                    />
                  </div>
                ))}
              </div>

              {links.length < 5 && (
                <button onClick={addLink} style={{
                  background: "transparent", border: `1.5px dashed ${BRAND.blue}55`,
                  borderRadius: 10, color: BRAND.blue, padding: "12px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 20,
                }}>
                  + Add Link ({links.length}/5)
                </button>
              )}

              <div style={{
                background: BRAND.yellowLight, border: `1.5px solid ${BRAND.yellow}`,
                borderRadius: 10, padding: 14, marginBottom: 24,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.blue }}>FUSE101 Profile (Auto-added as #6)</div>
                  <div style={{ fontSize: 11, color: BRAND.midGray, marginTop: 2 }}>fuse101.com/your-business</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ ...secondaryBtn, flex: 1 }}>← Back</button>
                <button onClick={() => setStep(3)} style={{ ...primaryBtn, flex: 2, width: "auto" }}>
                  Next: Display Settings →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6, color: BRAND.blue }}>
                Display & Export
              </div>
              <div style={{ fontSize: 13, color: BRAND.midGray, marginBottom: 28 }}>
                Choose what your widget shows and get your embed code
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Display Mode</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {DISPLAY_MODES.map(mode => (
                    <div key={mode.id} onClick={() => setDisplayMode(mode.id)} style={{
                      background: displayMode === mode.id ? BRAND.yellowLight : BRAND.offWhite,
                      border: `2px solid ${displayMode === mode.id ? BRAND.yellow : BRAND.lightGray}`,
                      borderRadius: 10, padding: 14, cursor: "pointer", transition: "all 0.2s",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.blue, marginBottom: 4 }}>{mode.label}</div>
                      <div style={{ fontSize: 11, color: BRAND.midGray }}>{mode.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {displayMode === "custom" && (
                <div style={{ marginBottom: 28 }}>
                  <label style={labelStyle}>Show / Hide Elements</label>
                  {[
                    { key: "qr", label: "QR Code" },
                    { key: "name", label: "Business Name" },
                    { key: "branding", label: "FUSE101 Branding" },
                    { key: "links", label: "Link List" },
                  ].map(opt => (
                    <div key={opt.key}
                      onClick={() => setCustomOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 0", borderBottom: `1px solid ${BRAND.lightGray}`, cursor: "pointer",
                      }}>
                      <span style={{ fontSize: 13, color: BRAND.blue, fontWeight: 500 }}>{opt.label}</span>
                      <div style={{
                        width: 38, height: 22, borderRadius: 11,
                        background: customOptions[opt.key] ? BRAND.yellow : BRAND.lightGray,
                        position: "relative", transition: "background 0.2s",
                      }}>
                        <div style={{
                          position: "absolute", top: 4,
                          left: customOptions[opt.key] ? 20 : 4,
                          width: 14, height: 14, borderRadius: "50%",
                          background: customOptions[opt.key] ? BRAND.blue : BRAND.white,
                          transition: "left 0.2s",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Embed Code</label>
                <EmbedCode displayMode={displayMode} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Download PNG", icon: "🖼" },
                  { label: "Download PDF", icon: "📄" },
                  { label: "Share Link", icon: "🔗" },
                ].map(btn => (
                  <button key={btn.label} style={{
                    background: BRAND.offWhite, border: `1.5px solid ${BRAND.lightGray}`,
                    borderRadius: 10, color: BRAND.blue, padding: "12px 8px",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{btn.icon}</div>
                    {btn.label}
                  </button>
                ))}
              </div>

              <button onClick={() => setStep(1)} style={{ ...secondaryBtn, width: "100%" }}>← Start Over</button>
            </div>
          )}
        </div>

        {/* Right Panel - Live Preview */}
        <div style={{
          width: "45%", padding: "32px 24px",
          display: "flex", flexDirection: "column", alignItems: "center",
          background: BRAND.offWhite, position: "sticky", top: 0,
          height: "calc(100vh - 79px)", overflowY: "auto",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: BRAND.midGray,
            letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 24,
          }}>
            Live Preview
          </div>

          <WidgetPreview config={config} />

          <div style={{ marginTop: 24, width: "100%", maxWidth: 280 }}>
            <div style={{
              background: BRAND.white, border: `1.5px solid ${BRAND.lightGray}`,
              borderRadius: 12, padding: 16,
            }}>
              <div style={{
                fontSize: 11, color: BRAND.blue, marginBottom: 10,
                fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B85B5",
              }}>Widget Stats Preview</div>
              {[
                { label: "Total Scans", note: "Live on FUSE101" },
                { label: "Link Clicks", note: "Full analytics" },
                { label: "Top Platform", note: "Device tracking" },
              ].map(stat => (
                <div key={stat.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: `1px solid ${BRAND.lightGray}`,
                }}>
                  <span style={{ fontSize: 12, color: BRAND.blue }}>{stat.label}</span>
                  <span style={{ fontSize: 11, color: BRAND.midGray, fontStyle: "italic" }}>{stat.note}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 11, color: BRAND.midGray, textAlign: "center" }}>
                Full analytics on FUSE101 dashboard
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
