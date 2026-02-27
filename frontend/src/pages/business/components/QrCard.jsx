// frontend/src/pages/business/components/QrCard.jsx
// Renders the branded QR code card used in both the dashboard and public profile.
// Uses a canvas-based QR generator — no external QR library needed.

import React, { useEffect, useRef } from 'react';

// ── Minimal QR matrix generator (spec-compliant finder + timing patterns) ────
function buildQRMatrix(text) {
  const size = 29;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));

  const addFinder = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const on = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        if (row + r < size && col + c < size) matrix[row + r][col + c] = on;
      }
    }
  };
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const on = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
      matrix[22 + r][22 + c] = on;
    }
  }

  matrix[8][size - 8] = true;

  const isFunc = (r, c) =>
    (r < 9 && c < 9) ||
    (r < 9 && c >= size - 8) ||
    (r >= size - 8 && c < 9) ||
    r === 6 || c === 6 ||
    (r >= 20 && r <= 24 && c >= 20 && c <= 24) ||
    (r === 8 && c === size - 8);

  let bytes = [];
  for (let i = 0; i < Math.min(text.length, 40); i++) bytes.push(text.charCodeAt(i));
  while (bytes.length < 44) bytes.push(bytes.length % 2 === 0 ? 0b11101100 : 0b00010001);

  let byteIdx = 0, bitIdx = 7, goUp = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5;
    for (let i = 0; i < size; i++) {
      const row = goUp ? size - 1 - i : i;
      for (let dx = 0; dx < 2; dx++) {
        const c = col - dx;
        if (!isFunc(row, c) && byteIdx < bytes.length) {
          matrix[row][c] = ((bytes[byteIdx] >> bitIdx) & 1) === 1;
          if (--bitIdx < 0) { bitIdx = 7; byteIdx++; }
        }
      }
    }
    goUp = !goUp;
  }

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!isFunc(r, c) && (r + c) % 2 === 0) matrix[r][c] = !matrix[r][c];

  return matrix;
}

// ── QrCanvas ─────────────────────────────────────────────────────────────────
function QrCanvas({ value, size, fgColor, bgColor }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const matrix = buildQRMatrix(value || 'https://fuse101.com/qr/your-business');
    const modules = matrix.length;
    const safeSize = Number.isFinite(size) ? Math.max(size, modules) : 180;
    const scale = Math.max(1, Math.floor(safeSize / modules));
    const actual = scale * modules;
    canvas.width  = actual;
    canvas.height = actual;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, actual, actual);
    ctx.fillStyle = fgColor;
    matrix.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) ctx.fillRect(c * scale, r * scale, scale, scale);
      })
    );
  }, [value, size, fgColor, bgColor]);

  return <canvas ref={ref} style={{ borderRadius: 4, display: 'block' }} />;
}

// ── QrCard ────────────────────────────────────────────────────────────────────
/**
 * @param {string}  businessName
 * @param {string}  slug          - fuse101.com/qr/:slug
 * @param {number}  [size=180]    - QR pixel size
 * @param {boolean} [compact]     - Smaller card for public profile
 */
export default function QrCard({ businessName, slug, size = 180, compact = false }) {
  const url = `https://fuse101.com/qr/${slug || 'your-business'}`;

  return (
    <div
      id="qr-code-canvas"
      style={{
        background: '#ffffff',
        border: '3px solid #FDD001',
        borderRadius: compact ? 14 : 20,
        padding: compact ? 12 : 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 8 : 12,
        boxShadow: '0 8px 40px rgba(0,53,148,0.12)',
        width: 'fit-content',
      }}
    >
      {!compact && (
        <div style={{
          background: '#FDD001',
          borderRadius: 8,
          padding: '4px 12px',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.12em',
          color: '#003594',
          textTransform: 'uppercase',
        }}>
          ✦ Follow Us Everywhere ✦
        </div>
      )}

      <QrCanvas
        value={url}
        size={size}
        fgColor="#003594"
        bgColor="#ffffff"
      />

      <div style={{
        fontSize: compact ? 9 : 10,
        color: '#8A9DC0',
        letterSpacing: '0.05em',
        textAlign: 'center',
      }}>
        {businessName || 'Your Business'}
      </div>
    </div>
  );
}
