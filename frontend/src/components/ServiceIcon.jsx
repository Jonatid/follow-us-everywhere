import React from 'react';

const iconStyle = {
  width: '20px',
  height: '20px',
  display: 'block',
  flexShrink: 0,
};

export const SERVICE_ICONS = {
  car: {
    label: 'Car / Vehicle',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M5 11l1.5-4.5h11L19 11M17.5 16a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 13a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 17.5 16m-11 0A1.5 1.5 0 0 1 5 14.5 1.5 1.5 0 0 1 6.5 13 1.5 1.5 0 0 1 8 14.5 1.5 1.5 0 0 1 6.5 16M18.92 6c-.2-.58-.76-1-1.42-1H6.5c-.66 0-1.22.42-1.42 1L3 12v8a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-8l-2.08-6z"/>
      </svg>
    ),
  },
  briefcase: {
    label: 'Briefcase / Business',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M20 6h-2.18c.07-.44.18-.86.18-1a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3c0 .14.11.56.18 1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V5zm11 14H4v-2h16v2zm0-5H4V8h5v2h6V8h5v6z"/>
      </svg>
    ),
  },
  globe: {
    label: 'Globe / International',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93A8.001 8.001 0 0 1 4.07 13H6c.33 2.526 1.887 4.67 4 5.93zm0-3.03A6.002 6.002 0 0 1 6.07 13H11v3.9zM11 11H6.07A6.002 6.002 0 0 1 11 7.1V11zm0-5.93C8.887 6.33 7.33 8.474 7 11H4.07A8.001 8.001 0 0 1 11 5.07v-.001zM13 5.07A8.001 8.001 0 0 1 19.93 11H17c-.33-2.526-1.887-4.67-4-5.93zm0 3.03A6.002 6.002 0 0 1 17.93 11H13V8.1zM13 13h4.93A6.002 6.002 0 0 1 13 16.9V13zm0 5.93V19A8.001 8.001 0 0 1 19.93 13H17c-.33 2.526-1.887 4.67-4 5.93z"/>
      </svg>
    ),
  },
  heart: {
    label: 'Heart / Care',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
  },
  shield: {
    label: 'Shield / Security',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l6 2.67V11c0 3.67-2.55 7.1-6 8.13C8.55 18.1 6 14.67 6 11V7.67L12 5z"/>
      </svg>
    ),
  },
  star: {
    label: 'Star / Featured',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    ),
  },
  lightning: {
    label: 'Lightning / Fast',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/>
      </svg>
    ),
  },
  people: {
    label: 'People / Community',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
  },
  tools: {
    label: 'Tools / Repair',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
      </svg>
    ),
  },
  chart: {
    label: 'Chart / Analytics',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
      </svg>
    ),
  },
  leaf: {
    label: 'Leaf / Sustainability',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 0-4-4-2-4-2h-2C8 1 6 3 6 3c-2 3-1 9-1 9s7-2 8-7c.82 1.86 2.41 3 4 3z"/>
      </svg>
    ),
  },
  home: {
    label: 'Home / Real Estate',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    ),
  },
  phone: {
    label: 'Phone / Support',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
      </svg>
    ),
  },
  package: {
    label: 'Package / Delivery',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A1.008 1.008 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71L5 9.21v6.7zm14 0v-6.7l-6 3.37v6.71l6-3.38z"/>
      </svg>
    ),
  },
  education: {
    label: 'Education / Training',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 3L1 9l4 2.18V15c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-3.82L21 9.36V15h2V9L12 3zm6 10l-6 3.27L6 13v-2.27l6 3.27 6-3.27V13z"/>
      </svg>
    ),
  },
  food: {
    label: 'Food / Restaurant',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-4.5-6.72-5-8.03-5S0 10.49 0 14.99v1h15.03v-1z"/>
      </svg>
    ),
  },
  medical: {
    label: 'Medical / Health',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
      </svg>
    ),
  },
  camera: {
    label: 'Camera / Media',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
      </svg>
    ),
  },
  money: {
    label: 'Money / Finance',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
      </svg>
    ),
  },
  settings: {
    label: 'Settings / Tech',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    ),
  },
  location: {
    label: 'Location / Local',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    ),
  },
  art: {
    label: 'Art / Creative',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0 1 12 22zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5a.54.54 0 0 0-.14-.35c-.41-.46-.63-1.05-.63-1.65A2.5 2.5 0 0 1 14.5 15H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7z"/>
        <circle cx="6.5" cy="11.5" r="1.5" fill="currentColor"/>
        <circle cx="9.5" cy="7.5" r="1.5" fill="currentColor"/>
        <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor"/>
        <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  music: {
    label: 'Music / Entertainment',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
    ),
  },
  fitness: {
    label: 'Fitness / Sport',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
      </svg>
    ),
  },
  shopping: {
    label: 'Shopping / Retail',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={iconStyle}>
        <path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.47 5H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    ),
  },
};

export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS);

const iconSvgStyle = {
  width: '20px',
  height: '20px',
  display: 'block',
  flexShrink: 0,
};

export const ServiceIcon = ({ iconKey, size, color }) => {
  const entry = SERVICE_ICONS[iconKey];
  if (!entry) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"
        style={{ ...iconSvgStyle, width: size || '20px', height: size || '20px', color: color || 'currentColor' }}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path fill="currentColor" d="M12 7a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0V8a1 1 0 0 1 1-1zm0 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
      </svg>
    );
  }
  return React.cloneElement(entry.svg, {
    style: { ...iconSvgStyle, width: size || '20px', height: size || '20px', color: color || 'currentColor' },
  });
};

export const ServiceIconPicker = ({ value, onChange }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginTop: '6px' }}>
      {SERVICE_ICON_KEYS.map((key) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            title={SERVICE_ICONS[key].label}
            aria-label={SERVICE_ICONS[key].label}
            aria-pressed={selected}
            onClick={() => onChange(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1',
              border: selected ? '2px solid #0047cc' : '1px solid #e2e8f0',
              borderRadius: '8px',
              background: selected ? '#eef4ff' : '#f8fafc',
              color: selected ? '#0047cc' : '#475569',
              cursor: 'pointer',
              padding: '8px',
              transition: 'border-color .15s, background .15s',
            }}
          >
            <ServiceIcon iconKey={key} size="20px" />
          </button>
        );
      })}
    </div>
  );
};

export default ServiceIcon;
