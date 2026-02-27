// frontend/src/pages/public/PublicBusinessProfile.jsx
// The public-facing business profile page.
// Displays the QR code only if the business has enabled it (qrEnabled flag).
// Designed to be embedded or linked to from fuse101.com/business/:slug

import React, { useState } from 'react';
import QrCard from '../business/components/QrCard';

const BRAND = {
  blue:      '#003594',
  yellow:    '#FDD001',
  white:     '#FFFFFF',
  offWhite:  '#F4F7FF',
  lightGray: '#E8EDF8',
  midGray:   '#8A9DC0',
};

/**
 * Props (typically fetched from GET /api/public/businesses/:slug):
 * @param {string}   businessName
 * @param {string}   slug
 * @param {string}   tagline
 * @param {string}   category
 * @param {string}   logoUrl
 * @param {boolean}  qrEnabled     - business chooses to show/hide QR
 * @param {Array}    socialLinks    - [{ platform, url, icon }]
 */
export default function PublicBusinessProfile({
  businessName = 'Your Business',
  slug         = '',
  tagline      = '',
  category     = '',
  logoUrl      = null,
  qrEnabled    = false,
  socialLinks  = [],
}) {
  const [qrExpanded, setQrExpanded] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: BRAND.white,
      fontFamily: "'DM Sans', sans-serif",
      color: BRAND.blue,
    }}>

      {/* Hero / Business Header */}
      <div style={{
        background: BRAND.blue,
        padding: '40px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        position: 'relative',
      }}>
        {/* Dot pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `radial-gradient(circle, ${BRAND.yellow} 1px, transparent 1px)`,
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />

        {/* Logo */}
        {logoUrl ? (
          <img src={logoUrl} alt={businessName} style={{
            width: 80, height: 80, borderRadius: 16,
            border: `3px solid ${BRAND.yellow}`, objectFit: 'cover',
          }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: 16,
            background: BRAND.yellow, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900, color: BRAND.blue,
            border: `3px solid ${BRAND.yellow}`,
          }}>
            {businessName.charAt(0)}
          </div>
        )}

        {/* Badge */}
        <div style={{
          background: BRAND.yellow, borderRadius: 20,
          padding: '4px 14px', fontSize: 10, fontWeight: 800,
          letterSpacing: '0.12em', color: BRAND.blue, textTransform: 'uppercase',
        }}>
          ✦ Follow Us Everywhere ✦
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 800, color: BRAND.white,
          textAlign: 'center', letterSpacing: '-0.03em', margin: 0,
        }}>
          {businessName}
        </h1>

        {tagline && (
          <p style={{ fontSize: 13, color: `${BRAND.yellow}cc`, textAlign: 'center', margin: 0 }}>
            {tagline}
          </p>
        )}

        {category && (
          <div style={{
            background: 'rgba(255,255,255,0.12)', borderRadius: 20,
            padding: '4px 14px', fontSize: 11, color: BRAND.white, fontWeight: 600,
          }}>
            {category}
          </div>
        )}
      </div>

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div style={{ padding: '24px 24px 0', maxWidth: 480, margin: '0 auto' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: BRAND.midGray,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Connect With Us
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {socialLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: BRAND.offWhite,
                  border: `1.5px solid ${BRAND.lightGray}`,
                  borderRadius: 14, padding: '13px 18px',
                  textDecoration: 'none', transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = BRAND.blue}
                onMouseLeave={e => e.currentTarget.style.borderColor = BRAND.lightGray}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: BRAND.lightGray, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                }}>
                  {link.icon || '🔗'}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.blue, flex: 1 }}>
                  {link.platform}
                </span>
                <span style={{ fontSize: 13, color: BRAND.midGray }}>→</span>
              </a>
            ))}

            {/* FUSE101 profile link — always shown */}
            <a
              href={`https://fuse101.com/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: BRAND.yellow, borderRadius: 14,
                padding: '13px 18px', textDecoration: 'none',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: BRAND.blue, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
              }}>⭐</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.blue, flex: 1 }}>
                View Full FUSE101 Profile
              </span>
              <span style={{ fontSize: 13, color: BRAND.blue }}>→</span>
            </a>
          </div>
        </div>
      )}

      {/* QR Code Section — only if business enabled it */}
      {qrEnabled && (
        <div style={{
          padding: '28px 24px',
          maxWidth: 480,
          margin: '0 auto',
        }}>
          <div
            onClick={() => setQrExpanded(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: BRAND.offWhite, border: `1.5px solid ${BRAND.lightGray}`,
              borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
              marginBottom: qrExpanded ? 16 : 0, transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: BRAND.blue, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="#FDD001" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="#FDD001" strokeWidth="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="#FDD001" strokeWidth="2"/>
                  <rect x="14" y="14" width="4" height="4" fill="#FDD001"/>
                  <rect x="19" y="14" width="2" height="2" fill="#FDD001"/>
                  <rect x="14" y="19" width="2" height="2" fill="#FDD001"/>
                  <rect x="17" y="17" width="2" height="5" fill="#FDD001"/>
                  <rect x="19" y="17" width="3" height="2" fill="#FDD001"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.blue }}>
                  Scan to Follow Us
                </div>
                <div style={{ fontSize: 11, color: BRAND.midGray, marginTop: 1 }}>
                  {qrExpanded ? 'Tap to hide QR code' : 'Tap to show QR code'}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: 18, color: BRAND.midGray,
              transform: qrExpanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.3s',
            }}>
              ↓
            </div>
          </div>

          {qrExpanded && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0 4px',
              animation: 'fadeUp 0.3s ease both',
            }}>
              <QrCard businessName={businessName} slug={slug} size={160} compact />
              <div style={{ fontSize: 11, color: BRAND.midGray, textAlign: 'center' }}>
                Scan with your phone camera to connect
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '24px',
        fontSize: 11, color: BRAND.midGray, borderTop: `1px solid ${BRAND.lightGray}`,
      }}>
        Powered by <span style={{ color: BRAND.blue, fontWeight: 700 }}>FUSE101</span>
        {' · '}
        <a href="https://fuse101.com" style={{ color: BRAND.midGray }}>Follow Us Everywhere</a>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
