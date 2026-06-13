import React from 'react';
import { BackLink } from '../components/BackLink';

export const LandingPage = ({ onNavigate }) => (
  <div className="page page--gradient">
    <div className="card card--wide text-center">
      <BackLink fallbackPath="/" onFallbackNavigate={() => onNavigate('marketing-landing', null, '/')} label="← Back to Home" />
      <div className="stack-lg">
        <h1 className="heading-xxl">Follow Us Everywhere</h1>
        <p className="subtitle-lg">One link to connect customers to all your social pages.</p>
        <p className="subtitle">Get your custom link and QR code in minutes.</p>
      </div>
      <div className="stack-md">
        <button type="button" onClick={() => onNavigate('signup')} className="button button-primary button-lg">
          Create Your Follow Hub
        </button>
        <button type="button" onClick={() => onNavigate('login')} className="button button-secondary button-lg">
          Business Login
        </button>
      </div>
    </div>
  </div>
);
