import React from 'react';

/**
 * Social Hub — Coming Soon
 *
 * The social publishing integration (Zernio OAuth + post dispatch) is not
 * yet complete. Posts queued in the current backend never reach the provider,
 * and the OAuth callback route is missing. Showing the old UI would let
 * businesses believe they are publishing when they are not.
 *
 * This placeholder replaces the feature until the integration is finished.
 */
const SocialHub = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 320,
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <circle cx="18" cy="5" r="3" stroke="white" strokeWidth="2" />
          <circle cx="6" cy="12" r="3" stroke="white" strokeWidth="2" />
          <circle cx="18" cy="19" r="3" stroke="white" strokeWidth="2" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: 10 }}>
        Social Publishing — Coming Soon
      </h2>

      <p style={{ fontSize: 15, color: 'var(--text-secondary, #64748b)', maxWidth: 420, lineHeight: 1.6, marginBottom: 8 }}>
        Connect your social accounts and publish to all your platforms from one place.
        We're putting the finishing touches on this feature.
      </p>

      <p style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', maxWidth: 380, lineHeight: 1.6 }}>
        You'll be notified as soon as it's ready.
      </p>
    </div>
  );
};

export default SocialHub;
