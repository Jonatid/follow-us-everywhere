// frontend/src/pages/business/components/QrDisplayModeSelector.jsx
import React from 'react';

const MODES = [
  { id: 'minimal',  label: 'Minimal',  desc: 'Just the QR code' },
  { id: 'branded',  label: 'Branded',  desc: 'QR + name + branding' },
  { id: 'full',     label: 'Full',     desc: 'QR + all links listed' },
  { id: 'custom',   label: 'Custom',   desc: 'You choose each element' },
];

export default function QrDisplayModeSelector({ value, onChange }) {
  return (
    <div style={{ width: '100%' }}>
      <label style={{
        display: 'block', marginBottom: 10,
        fontSize: 11, fontWeight: 700, color: '#6B85B5',
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        Display Mode
      </label>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        {MODES.map(mode => (
          <div
            key={mode.id}
            onClick={() => onChange(mode.id)}
            style={{
              background: value === mode.id ? 'rgba(253,208,1,0.15)' : '#F4F7FF',
              border: `2px solid ${value === mode.id ? '#FDD001' : '#E8EDF8'}`,
              borderRadius: 10, padding: '12px 14px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: '#003594', marginBottom: 3,
            }}>
              {mode.label}
            </div>
            <div style={{ fontSize: 11, color: '#8A9DC0' }}>
              {mode.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
