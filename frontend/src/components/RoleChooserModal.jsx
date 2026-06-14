import React from 'react';

const RoleChooserModal = ({ mode, onClose, onChoose }) => {
  const isLogin = mode === 'login';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div className="card card--medium" style={{ width: '100%', maxWidth: '440px' }}>
        <div className="row space-between" style={{ alignItems: 'center' }}>
          <h2 className="heading-lg" style={{ margin: 0 }}>{isLogin ? 'Log in as' : 'Sign up as'}</h2>
          <button type="button" className="link-button" onClick={onClose}>✕</button>
        </div>
        <p className="subtitle" style={{ marginTop: '10px' }}>
          Choose your account type to continue.
        </p>
        <div className="stack-sm" style={{ marginTop: '18px' }}>
          <button type="button" className="button button-primary button-full" onClick={() => onChoose(isLogin ? 'customer-login' : 'customer-signup')}>
            {isLogin ? 'Customer login' : 'Customer signup'}
          </button>
          <button type="button" className="button button-secondary button-full" onClick={() => onChoose(isLogin ? 'login' : 'signup')}>
            {isLogin ? 'Business login' : 'Business signup'}
          </button>
        </div>
      </div>
          </div>
  );
};

export default RoleChooserModal;
