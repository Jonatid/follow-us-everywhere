import React from 'react';

const handleBackNavigation = ({ fallbackPath, onFallbackNavigate }) => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  if (onFallbackNavigate) {
    onFallbackNavigate();
    return;
  }

  if (fallbackPath) {
    window.location.assign(fallbackPath);
  }
};

export const BackLink = ({ fallbackPath, onFallbackNavigate, label = '← Back' }) => (
  <button
    type="button"
    className="link-button"
    onClick={() => handleBackNavigation({ fallbackPath, onFallbackNavigate })}
  >
    {label}
  </button>
);


export default BackLink;
