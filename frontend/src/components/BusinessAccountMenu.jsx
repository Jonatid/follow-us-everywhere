import React, { useEffect, useRef, useState } from 'react';

export default function BusinessAccountMenu({ businessName, onNavigate, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="button button-secondary button-sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {businessName} ▾
      </button>
      {isOpen ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: '170px',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            background: 'white',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            padding: '8px',
            zIndex: 30,
          }}
        >
          <button
            type="button"
            className="link-button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onNavigate('dashboard', null, '/business');
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px' }}
          >
            Dashboard
          </button>
          <button
            type="button"
            className="link-button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onNavigate('social-hub', null, '/dashboard/social');
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px' }}
          >
            Social Hub
          </button>
          <button
            type="button"
            className="link-button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onNavigate('business-profile', null, '/business/profile');
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px' }}
          >
            Profile
          </button>
          <button
            type="button"
            className="link-button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px' }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
