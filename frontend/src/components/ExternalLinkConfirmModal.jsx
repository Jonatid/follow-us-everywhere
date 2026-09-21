import React, { useEffect, useRef } from 'react';

const normalizeExternalUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

export default function ExternalLinkConfirmModal({
  open,
  url,
  destinationName = 'this website',
  onClose,
}) {
  const continueButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousActiveElement = document.activeElement;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => continueButtonRef.current?.focus());

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleContinue = () => {
    const safeUrl = normalizeExternalUrl(url);
    if (!safeUrl) {
      onClose?.();
      return;
    }

    const newWindow = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }
    onClose?.();
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(15, 23, 42, 0.62)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="external-link-title"
        aria-describedby="external-link-description"
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)',
        }}
      >
        <h2 id="external-link-title" className="heading-lg" style={{ marginBottom: '8px' }}>
          You&apos;re leaving our site
        </h2>
        <p id="external-link-description" className="subtitle" style={{ marginBottom: '20px' }}>
          You&apos;re about to visit <strong>{destinationName}</strong>, an external website. It will open in a new tab.
        </p>

        <div className="row row-wrap" style={{ justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="button button-muted" onClick={() => onClose?.()}>
            Stay Here
          </button>
          <button
            ref={continueButtonRef}
            type="button"
            className="button button-primary"
            onClick={handleContinue}
          >
            Continue to Website
          </button>
        </div>
      </div>
    </div>
  );
}

export { normalizeExternalUrl };
