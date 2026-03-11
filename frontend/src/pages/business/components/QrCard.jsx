// frontend/src/pages/business/components/QrCard.jsx
// Renders the branded QR code card used in both the dashboard and public profile.

import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const configuredPublicWebUrl =
  (typeof process !== 'undefined' && process.env?.REACT_APP_PUBLIC_WEB_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_WEB_URL) ||
  '';

const normalizePublicKey = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const getPublicBaseUrl = () => {
  const configuredBase = configuredPublicWebUrl.trim();
  if (configuredBase) return configuredBase.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://fuse101.com';
};

const buildPublicBusinessUrl = (slug) => {
  const normalizedSlug = normalizePublicKey(slug) || 'your-business';
  return `${getPublicBaseUrl()}/b/${encodeURIComponent(normalizedSlug)}`;
};

// ── QrCard ────────────────────────────────────────────────────────────────────
/**
 * @param {string}  businessName
 * @param {string}  slug          - public business key
 * @param {number}  [size=200]    - QR pixel size
 * @param {boolean} [compact]     - Smaller card for public profile
 */
export default function QrCard({
  businessName,
  slug,
  size = 200,
  compact = false,
  showBranding = true,
  showBusinessName = true,
}) {
  const url = buildPublicBusinessUrl(slug);

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
      {!compact && showBranding && (
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

      <QRCodeCanvas
        value={url}
        size={size}
        fgColor="#003594"
        bgColor="#ffffff"
        includeMargin
        style={{ borderRadius: 4, display: 'block', imageRendering: 'pixelated' }}
      />

      {showBusinessName ? (
        <div style={{
          fontSize: compact ? 9 : 10,
          color: '#8A9DC0',
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}>
          {businessName || 'Your Business'}
        </div>
      ) : null}
    </div>
  );
}
