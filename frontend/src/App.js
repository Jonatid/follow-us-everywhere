// =============================================================================
// COMPLETE API-CONNECTED APP.JS
// =============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import verifiedIcon from './assets/md-verified.svg';
import heroBg from './assets/vector-network.png';

// API base URL (override with VITE_API_BASE_URL at build time if needed).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://followuseverywhere-api.onrender.com/api');

// =============================================================================
// API SERVICE
// =============================================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

const customerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

customerApi.interceptors.request.use((config) => {
  const requestUrl = `${config.baseURL || ''}${config.url || ''}`;
  const isPublicRequest = requestUrl.includes('/api/public/') || (config.url || '').startsWith('/public/');
  if (isPublicRequest) {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  }

  const token = localStorage.getItem('customer_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;


const toAbsoluteAssetUrl = (assetPath) => {
  const normalized = typeof assetPath === 'string' ? assetPath.trim() : '';
  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  const leadingSlashPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${apiOrigin}${leadingSlashPath}`;
};
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,64}$/;
const PASSWORD_HELPER =
  'Password must be at least 12 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.';

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

const BackLink = ({ fallbackPath, onFallbackNavigate, label = '← Back' }) => (
  <button
    type="button"
    className="link-button"
    onClick={() => handleBackNavigation({ fallbackPath, onFallbackNavigate })}
  >
    {label}
  </button>
);

// =============================================================================
// LANDING PAGE
// =============================================================================

const LandingPage = ({ onNavigate }) => (
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

const MarketingLandingPage = ({ onNavigate, onOpenRoleModal }) => {
  const [openFeatureCard, setOpenFeatureCard] = useState('one-smart-profile');

  const marketingFeatureCards = [{
    id: 'one-smart-profile',
    title: 'One Smart Profile',
    preview: 'All your links, values, and updates in one structured page.',
    bullets: [
      'Links, socials, and contact in one place',
      'Clear positioning customers can trust',
      'Update anytime without breaking your link'
    ]
  }, {
    id: 'what-it-is',
    title: 'What It Is',
    preview: 'A focused business profile link that helps people quickly understand what you offer.',
    bullets: [
      'One place for key links and contact channels',
      'Clear info for day-to-day purchase decisions',
      'A practical way to show steady community commitment'
    ]
  }, {
    id: 'how-it-works',
    title: 'How It Works',
    preview: 'A simple flow for businesses and communities.',
    bullets: [
      'Businesses join for free and share who they are',
      'Optional cause badges tied to verification requests',
      'Communities choose where to spend with clarity'
    ]
  }, {
    id: 'cause-visibility',
    title: 'Cause Visibility (Optional)',
    preview: 'Show verified community support with clarity.',
    bullets: [
      'Optional badge requests',
      'Clear verification process',
      'Transparent plain-language presentation'
    ]
  }, {
    id: 'built-differently',
    title: 'Built Differently',
    preview: 'A calmer, business-first approach.',
    bullets: [
      'Businesses control their own profile and updates',
      'No hype language or moral ranking',
      'Structured information for transparency'
    ]
  }, {
    id: 'why-businesses-use-it',
    title: 'Why Businesses Use It',
    preview: 'Practical benefits that stay consistent.',
    bullets: [
      'Simple setup and updates without technical overhead',
      'Stronger visibility from one trusted link',
      'Consistent messaging across campaigns'
    ]
  }];

  return (
    <div className="page page--gradient marketing-page" style={{ minHeight: '100vh', justifyContent: 'flex-start' }}>
      <section
        className="home-hero"
        aria-label="Home hero"
      >
        <div className="home-hero__overlay">
          <div className="home-hero__content stack-lg text-center">
            <h1 className="heading-xxl home-hero__title">Built for Businesses That Show Up.</h1>
            <p className="subtitle-lg home-hero__tagline">
              Share your links, your services, and what matters to your business — all in one trusted place.
            </p>
            <div>
              <button type="button" className="button button-primary button-lg" onClick={() => onOpenRoleModal('signup')}>
                Sign up free
              </button>
              <button type="button" className="button button-secondary button-lg" style={{ marginLeft: '12px' }} onClick={() => onNavigate('discover', null, '/discover')}>
                Explore businesses
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="marketing-main">
        <section className="home-cards-section" aria-label="Home feature cards">
          <div className="home-cards-container card card--wide" style={{ width: '100%', maxWidth: '1120px' }}>
            <div className="marketing-feature-grid" style={{ marginTop: '8px' }}>
              {marketingFeatureCards.slice(0, 3).map((feature) => {
                const isOpen = openFeatureCard === feature.id;

                return (
                  <div key={feature.id} className={`marketing-feature-card${isOpen ? ' marketing-feature-card--open' : ''}`}>
                    <h3 className="heading-md marketing-feature-card__title">{feature.title}</h3>
                    <p className="subtitle marketing-feature-card__preview">{feature.preview}</p>
                    <button
                      type="button"
                      className="marketing-feature-card__button card-toggle-link"
                      onClick={() => setOpenFeatureCard(isOpen ? null : feature.id)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? 'Less info' : 'More info'}
                    </button>
                    <div className={`marketing-feature-card__details${isOpen ? ' marketing-feature-card__details--open' : ''}`}>
                      <ul className="marketing-feature-card__list">
                        {feature.bullets.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="home-blue-band" aria-hidden="true">
            <div className="home-blue-band__inner" />
          </div>

          <div className="home-cards-container card card--wide" style={{ width: '100%', maxWidth: '1120px' }}>
            <div className="marketing-feature-grid" style={{ marginTop: '8px' }}>
              {marketingFeatureCards.slice(3).map((feature) => {
                const isOpen = openFeatureCard === feature.id;

                return (
                <div key={feature.id} className={`marketing-feature-card${isOpen ? ' marketing-feature-card--open' : ''}`}>
                  <h3 className="heading-md marketing-feature-card__title">{feature.title}</h3>
                  <p className="subtitle marketing-feature-card__preview">{feature.preview}</p>
                  <button
                    type="button"
                    className="marketing-feature-card__button card-toggle-link"
                    onClick={() => setOpenFeatureCard(isOpen ? null : feature.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'Less info' : 'More info'}
                  </button>
                  <div className={`marketing-feature-card__details${isOpen ? ' marketing-feature-card__details--open' : ''}`}>
                    <ul className="marketing-feature-card__list">
                      {feature.bullets.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const AboutPage = ({ onNavigate }) => (
  <div className="page page--gradient platform-page">
    <div className="platform-page__content">
      <section className="platform-hero" aria-label="The Platform mission">
        <div className="platform-hero__overlay">
          <h1 className="heading-xl platform-hero__title">The Trust Layer for Business Identity.</h1>
          <p className="subtitle platform-hero__tagline">Follow Us Everywhere is governed digital infrastructure for verified businesses.</p>
          <div className="platform-hero__actions">
            <button type="button" className="button button-primary button-lg" onClick={() => onNavigate('discover', null, '/discover')}>
              Explore Businesses
            </button>
            <button type="button" className="button button-secondary button-lg" onClick={() => onNavigate('signup')}>
              Become a Business
            </button>
          </div>
        </div>
      </section>

      <main className="platform-main">
        <section className="home-cards-section" aria-label="The Platform sections">
          <div className="home-cards-container platform-cards-group">
            <div className="platform-cards-grid">
              <section className="platform-section-card" aria-labelledby="platform-problem-title">
                <h2 id="platform-problem-title" className="heading-lg platform-section-card__title">The Problem</h2>
                <div className="platform-rhythm-lines">
                  <p className="subtitle">The internet made it easy to create links.</p>
                  <p className="subtitle">It did not make it easy to build trust.</p>
                </div>
                <ul className="platform-list">
                  <li>No governance</li>
                  <li>No verification</li>
                  <li>No accountability</li>
                </ul>
              </section>

              <section className="platform-section-card" aria-labelledby="platform-difference-title">
                <h2 id="platform-difference-title" className="heading-lg platform-section-card__title">The Difference</h2>
                <div className="platform-difference-grid">
                  <div className="platform-difference-grid__column">
                    <h3 className="heading-md">Personal link pages</h3>
                  </div>
                  <div className="platform-difference-grid__column">
                    <h3 className="heading-md">Verified business infrastructure</h3>
                  </div>
                </div>
                <ul className="platform-list">
                  <li>Business-only accounts</li>
                  <li>Admin-governed platform</li>
                  <li>Policy enforcement</li>
                  <li>Community verification</li>
                  <li>Built for scale</li>
                </ul>
              </section>
            </div>
          </div>

          <div className="home-blue-band" aria-hidden="true">
            <div className="home-blue-band__inner" />
          </div>

          <div className="home-cards-container platform-cards-group">
            <div className="platform-cards-grid">
              <section className="platform-section-card" aria-labelledby="platform-vision-title">
                <h2 id="platform-vision-title" className="heading-lg platform-section-card__title">The Vision</h2>
                <div className="platform-rhythm-lines">
                  <p className="subtitle">We are building digital infrastructure for real businesses.</p>
                  <p className="subtitle">Not profiles.</p>
                  <p className="subtitle">Not vanity pages.</p>
                  <p className="subtitle">Infrastructure.</p>
                  <p className="subtitle">Governed.</p>
                  <p className="subtitle">Scalable.</p>
                  <p className="subtitle">Designed for partnerships, programs, and economic development.</p>
                </div>
              </section>

              <section className="platform-section-card" aria-labelledby="platform-direction-title">
                <h2 id="platform-direction-title" className="heading-lg platform-section-card__title">The Long-Term Direction</h2>
                <div className="platform-rhythm-lines">
                  <p className="subtitle">Thousands of businesses.</p>
                  <p className="subtitle">Verified community impact.</p>
                  <p className="subtitle">Searchable digital identity.</p>
                  <p className="subtitle">A trust-first marketplace.</p>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
);

const FAQPage = ({ onNavigate }) => (
  <div className="page page--gradient">
    <div className="card card--wide" style={{ maxWidth: '900px' }}>
      <BackLink fallbackPath="/" onFallbackNavigate={() => onNavigate('marketing-landing', null, '/')} label="← Back to home" />
      <h1 className="heading-xl" style={{ marginTop: '14px' }}>FAQ</h1>
      <div className="stack-sm" style={{ marginTop: '14px' }}>
        <div>
          <h3 className="heading-md">What is Fuse101?</h3>
          <p className="subtitle">Fuse101 gives you one public page to organize links for your audience.</p>
        </div>
        <div>
          <h3 className="heading-md">How do I get started?</h3>
          <p className="subtitle">Choose Customer or Business from Sign up free and follow the existing onboarding flow.</p>
        </div>
        <div>
          <h3 className="heading-md">Can I still access business tools?</h3>
          <p className="subtitle">Yes. Business access remains available at /business with no backend changes.</p>
        </div>
      </div>
    </div>
  </div>
);

// =============================================================================
// BUSINESS SIGNUP
// =============================================================================

const BusinessSignup = ({ onNavigate, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'name' && { slug: value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') })
    }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!PASSWORD_REGEX.test(formData.password)) {
      setError(PASSWORD_HELPER);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/signup', {
        name: formData.name,
        slug: formData.slug,
        tagline: formData.tagline,
        email: formData.email,
        password: formData.password
      });
      localStorage.setItem('token', response.data.token);
      onLoginSuccess(response.data.business);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('landing')} />
        <div className="stack-sm text-center">
          <h1 className="heading-xl">Create Your Follow Hub</h1>
          <p className="subtitle">Get started in under 2 minutes</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="stack-md">
          <div className="field">
            <label className="label" htmlFor="signup-name">Business Name *</label>
            <input
              id="signup-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input"
              placeholder="e.g., Joe's Coffee Shop"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="signup-slug">Your Custom Link</label>
            <div className="row">
              <span className="muted-text">followuseverywhere.app/</span>
              <input
                id="signup-slug"
                type="text"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                className="input input-inline"
                placeholder="yourname"
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="signup-tagline">Tagline (Optional)</label>
            <input
              id="signup-tagline"
              type="text"
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="input"
              placeholder="e.g., Best Coffee in Town"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="signup-email">Email *</label>
            <input
              id="signup-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="input"
              placeholder="you@business.com"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="signup-password">Password *</label>
            <input
              id="signup-password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="input"
              placeholder="Create a password"
            />
            {formData.password && !PASSWORD_REGEX.test(formData.password) && (
              <span className="field-error">{PASSWORD_HELPER}</span>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="signup-confirm-password">Confirm Password *</label>
            <input
              id="signup-confirm-password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className="input"
              placeholder="Re-enter your password"
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <span className="field-error">Passwords do not match.</span>
            )}
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Creating Account...' : 'Create Account & Continue'}
          </button>
        </div>
        <p className="helper-text text-center">
          Already have an account?{' '}
          <button type="button" onClick={() => onNavigate('login')} className="link-button link-button--inline">
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// BUSINESS LOGIN
// =============================================================================

const BusinessLogin = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      onLoginSuccess(response.data.business);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('landing')} />
        <div className="stack-sm text-center">
          <h1 className="heading-xl">Business Login</h1>
          <p className="subtitle">Access your dashboard</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="stack-md">
          <div className="field">
            <label className="label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@business.com"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Enter your password"
            />
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        <p className="helper-text text-center">
          <button type="button" onClick={() => onNavigate('forgot')} className="link-button link-button--inline">
            Forgot password?
          </button>
        </p>
        <p className="helper-text text-center">
          Don't have an account?{' '}
          <button type="button" onClick={() => onNavigate('signup')} className="link-button link-button--inline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// CUSTOMER SIGNUP
// =============================================================================

const CustomerSignup = ({ onNavigate, onAuthSuccess, initialMessage = '' }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    setMessage(initialMessage || '');
  }, [initialMessage]);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_HELPER);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await customerApi.post('/customers/auth/signup', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      localStorage.setItem('customer_token', response.data.token);
      onAuthSuccess(response.data.customer);
      onNavigate('discover');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Signup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('landing')} />
        <div className="stack-sm text-center">
          <h1 className="heading-xl">Customer Signup</h1>
          <p className="subtitle">Save your favorite businesses</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert">{message}</div>}
        <div className="stack-md">
          <div className="field">
            <label className="label" htmlFor="customer-signup-first-name">First Name *</label>
            <input
              id="customer-signup-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input"
              placeholder="Jane"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="customer-signup-last-name">Last Name *</label>
            <input
              id="customer-signup-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input"
              placeholder="Doe"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="customer-signup-email">Email *</label>
            <input
              id="customer-signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="customer-signup-password">Password *</label>
            <input
              id="customer-signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Create a password"
            />
            {password && !PASSWORD_REGEX.test(password) && (
              <span className="field-error">{PASSWORD_HELPER}</span>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="customer-signup-confirm">Confirm Password *</label>
            <input
              id="customer-signup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Re-enter your password"
            />
            {confirmPassword && password !== confirmPassword && (
              <span className="field-error">Passwords do not match.</span>
            )}
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Creating Account...' : 'Create Customer Account'}
          </button>
        </div>
        <p className="helper-text text-center">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('customer-login')}
            className="link-button link-button--inline"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// CUSTOMER LOGIN
// =============================================================================

const CustomerLogin = ({ onNavigate, onAuthSuccess, initialMessage = '' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    setMessage(initialMessage || '');
  }, [initialMessage]);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await customerApi.post('/customers/auth/login', { email, password });
      localStorage.setItem('customer_token', response.data.token);
      onAuthSuccess(response.data.customer);
      onNavigate('discover');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('landing')} />
        <div className="stack-sm text-center">
          <h1 className="heading-xl">Customer Login</h1>
          <p className="subtitle">Welcome back</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert">{message}</div>}
        <div className="stack-md">
          <div className="field">
            <label className="label" htmlFor="customer-login-email">Email</label>
            <input
              id="customer-login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="customer-login-password">Password</label>
            <input
              id="customer-login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Enter your password"
            />
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        <p className="helper-text text-center">
          <button
            type="button"
            onClick={() => onNavigate('customer-forgot')}
            className="link-button link-button--inline"
          >
            Forgot password?
          </button>
        </p>
        <p className="helper-text text-center">
          Need an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('customer-signup')}
            className="link-button link-button--inline"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

const CustomerForgotPassword = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await customerApi.post('/customers/auth/forgot-password', { email });
      setMessage(response.data?.message || 'If an account exists for that email, we sent a reset link.');
    } catch (err) {
      setMessage('If an account exists for that email, we sent a reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient"> 
      <div className="card card--medium"> 
        <BackLink fallbackPath="/discover" onFallbackNavigate={() => onNavigate('discover')} />
        <div className="stack-sm text-center"> 
          <h1 className="heading-xl">Reset your customer password</h1>
          <p className="subtitle">We&apos;ll email you a secure reset link.</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert">{message}</div>}
        <div className="stack-md"> 
          <div className="field"> 
            <label className="label" htmlFor="customer-forgot-email">Email</label>
            <input
              id="customer-forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerResetPassword = ({ onNavigate, token, onResetSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordInvalid = password && !PASSWORD_REGEX.test(password);
  const confirmMismatch = confirmPassword && password !== confirmPassword;

  const handleSubmit = async () => {
    setError('');

    if (!token) {
      setError('Reset token is missing.');
      return;
    }
    if (!password) {
      setError('Please enter your new password.');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_HELPER);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await customerApi.post('/customers/auth/reset-password', { token, password });
      onResetSuccess('Password updated successfully. You can now log in.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to reset password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient"> 
      <div className="card card--medium"> 
        <BackLink fallbackPath="/discover" onFallbackNavigate={() => onNavigate('discover')} />
        <div className="stack-sm text-center"> 
          <h1 className="heading-xl">Choose a new password</h1>
          <p className="subtitle">Your new password must meet our security requirements.</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="stack-md"> 
          <div className="field"> 
            <label className="label" htmlFor="customer-reset-password">New Password</label>
            <input
              id="customer-reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Create a new password"
            />
            {passwordInvalid && <span className="field-error">{PASSWORD_HELPER}</span>}
          </div>
          <div className="field"> 
            <label className="label" htmlFor="customer-reset-confirm-password">Confirm Password</label>
            <input
              id="customer-reset-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Re-enter your new password"
            />
            {confirmMismatch && <span className="field-error">Passwords do not match.</span>}
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerNav = ({ onNavigate, onLogout, activeScreen, customer }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = customer?.first_name || customer?.email || 'Customer';

  return (
    <div className="row space-between row-wrap" style={{ gap: '8px', marginBottom: '20px', alignItems: 'flex-start' }}>
      <div className="row row-wrap" style={{ gap: '8px' }}>
        <button
          type="button"
          className={`button button-sm ${activeScreen === 'discover' ? 'button-primary' : 'button-muted'}`}
          onClick={() => onNavigate('discover')}
        >
          Discover
        </button>
        <button
          type="button"
          className={`button button-sm ${activeScreen === 'favorites' ? 'button-primary' : 'button-muted'}`}
          onClick={() => onNavigate('favorites')}
        >
          Favorites
        </button>
      </div>

      {customer ? (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="button button-sm button-muted"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            Hello, {displayName}
          </button>
          {menuOpen && (
            <div className="card" style={{ position: 'absolute', right: 0, top: '40px', minWidth: '180px', zIndex: 20, padding: '10px' }}>
              <button type="button" className="button button-sm button-muted button-full" onClick={() => onNavigate('customer-profile')}>
                Profile
              </button>
              <button type="button" className="button button-sm button-muted button-full" onClick={onLogout} style={{ marginTop: '8px' }}>
                Logout
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const DiscoverPage = ({ onNavigate, onLogout, customer }) => {
  const [businessName, setBusinessName] = useState('');
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [communitySupport, setCommunitySupport] = useState('');
  const [badge, setBadge] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [businesses, setBusinesses] = useState([]);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impactModal, setImpactModal] = useState({ open: false, businessName: '', loading: false, error: '', data: null });
  const discoverRequestIdRef = useRef(0);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!localStorage.getItem('customer_token')) {
        setFavoriteIds(new Set());
        return;
      }

      try {
        const favoritesResponse = await customerApi.get('/customers/favorites');
        setFavoriteIds(new Set((favoritesResponse.data?.favorites || []).map((item) => item.id)));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to load favorites.'));
      }
    };

    loadFavorites();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = discoverRequestIdRef.current + 1;
    discoverRequestIdRef.current = requestId;

    const loadBusinesses = async () => {
      setLoading(true);
      setError('');
      try {
        const trimmedBusinessName = businessName.trim();
        const params = {
          page: currentPage,
          limit: itemsPerPage
        };

        if (trimmedBusinessName) {
          params.query = trimmedBusinessName;
        }

        const response = await customerApi.get('/public/businesses', {
          params,
          signal: controller.signal
        });

        if (discoverRequestIdRef.current !== requestId) {
          return;
        }

        setBusinesses(response.data?.businesses || []);
        setTotalBusinesses(Number(((response.data?.totalCount ?? response.data?.total) || 0)));
      } catch (err) {
        if (controller.signal.aborted || discoverRequestIdRef.current !== requestId) {
          return;
        }
        setError(getApiErrorMessage(err, 'Unable to load discover businesses.'));
      } finally {
        if (discoverRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    loadBusinesses();

    return () => {
      controller.abort();
    };
  }, [businessName, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [businessName, communitySupport, badge, itemsPerPage]);

  const filteredBusinesses = useMemo(() => {
    const normalizedCommunitySupport = communitySupport.trim().toLowerCase();
    const normalizedBadge = badge.trim().toLowerCase();

    return businesses.filter((business) => {
      const communitySupportValue = [
        business.community_support,
        business.communitySupport,
        business.community,
        business.community_name,
        business.communityName
      ]
        .flat()
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const badgesValue = [
        business.badges,
        business.badge,
        business.badge_names,
        business.badgeNames
      ]
        .flat()
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesCommunitySupport = normalizedCommunitySupport === '' || communitySupportValue.includes(normalizedCommunitySupport);
      const matchesBadge = normalizedBadge === '' || badgesValue.includes(normalizedBadge);

      return matchesCommunitySupport && matchesBadge;
    });
  }, [businesses, communitySupport, badge]);

  const totalPages = Math.max(1, Math.ceil(totalBusinesses / itemsPerPage));


  const openImpactModal = async (business) => {
    setImpactModal({ open: true, businessName: business.name, loading: true, error: '', data: null });

    try {
      const response = await customerApi.get(`/public/businesses/${business.id}/impact`);
      setImpactModal({
        open: true,
        businessName: business.name,
        loading: false,
        error: '',
        data: response.data
      });
    } catch (err) {
      setImpactModal({
        open: true,
        businessName: business.name,
        loading: false,
        error: getApiErrorMessage(err, 'Unable to load community impact.'),
        data: null
      });
    }
  };

  const toggleFavorite = async (businessId, isFavorited) => {
    if (!localStorage.getItem('customer_token')) {
      setShowSoftGate(true);
      return;
    }

    try {
      if (isFavorited) {
        await customerApi.delete(`/customers/favorites/${businessId}`);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
      } else {
        await customerApi.post(`/customers/favorites/${businessId}`);
        setFavoriteIds((prev) => new Set([...prev, businessId]));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update favorite.'));
    }
  };

  return (
    <div className="dashboard discover-page">
      <section className="discover-hero">
        <div className="discover-hero__inner">
          <h1 className="discover-hero__title">Discover Verified Businesses</h1>
          <p className="discover-hero__subtext">Search, filter, and connect with trusted organizations.</p>
        </div>
      </section>
      <div className="dashboard-container discover-shell">
        <div className="card dashboard-card">
          <CustomerNav onNavigate={onNavigate} onLogout={onLogout} activeScreen="discover" customer={customer} />

          <div className="discover-controls card">
            <p className="subtitle" style={{ marginTop: 0, marginBottom: '8px' }}>Search by</p>
            <div className="row row-wrap" style={{ gap: '12px', alignItems: 'flex-end' }}>
              <div className="field" style={{ marginTop: 0, flex: '1 1 220px' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginTop: 0, flex: '1 1 220px' }}>
                <select className="input" value={communitySupport} onChange={(e) => setCommunitySupport(e.target.value)}>
                  <option value="">Community support</option>
                  <option value="Community One">Community One</option>
                  <option value="Community Two">Community Two</option>
                  <option value="Community Three">Community Three</option>
                </select>
              </div>
              <div className="field" style={{ marginTop: 0, flex: '1 1 220px' }}>
                <select className="input" value={badge} onChange={(e) => setBadge(e.target.value)}>
                  <option value="">Badges</option>
                  <option value="Badge One">Badge One</option>
                  <option value="Badge Two">Badge Two</option>
                  <option value="Badge Three">Badge Three</option>
                </select>
              </div>
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <p className="muted-text" style={{ marginTop: '16px' }}>Loading businesses...</p>
          ) : (
            <div className="stack-md">
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
                <label className="muted-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Per page
                  <select className="input" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} style={{ width: '90px' }}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </label>
              </div>
              <div className="discover-results">
                {filteredBusinesses.map((business) => {
                  const isFavorited = favoriteIds.has(business.id);
                  const statusValue = (business.status || 'active').toLowerCase();
                  const isActive = statusValue === 'active';
                  const isVerified = business.verified === true || business.verification === 'verified';
                  return (
                    <div key={business.id} className="card discover-result-card" style={{ border: '1px solid var(--border)', boxShadow: 'none', padding: '20px' }}>
                      <div className="row space-between row-wrap" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <p className="heading-md">{business.name}</p>
                          <p className="subtitle">{business.tagline || 'No tagline available.'}</p>
                          <div className="row row-wrap" style={{ marginTop: '8px', gap: '8px' }}>
                            {isActive ? <span className="badge badge--active">Active</span> : null}
                            {isVerified ? (
                              <span className="badge badge--verified">
                                <img src={verifiedIcon} alt="" className="badge__icon" aria-hidden="true" />
                                Verified
                              </span>
                            ) : null}
                          </div>
                          <p className="muted-text">Status: {business.verification_status || 'unknown'}</p>
                        </div>
                        <div className="row" style={{ gap: '8px' }}>
                          <button
                            type="button"
                            className="button button-muted button-sm"
                            onClick={() => {
                              if (!localStorage.getItem('customer_token')) {
                                setShowSoftGate(true);
                                return;
                              }
                              onNavigate('public-route', business.slug);
                            }}
                          >
                            View Profile
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-sm"
                            onClick={() => openImpactModal(business)}
                          >
                            View Community Impact
                          </button>
                          <button
                            type="button"
                            className={`button button-sm ${isFavorited ? 'button-secondary' : 'button-primary'}`}
                            onClick={() => toggleFavorite(business.id, isFavorited)}
                          >
                            {isFavorited ? 'Unfavorite' : 'Favorite'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredBusinesses.length === 0 && <p className="muted-text">No businesses found.</p>}

              {impactModal.open ? (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
                  <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '80vh', overflow: 'auto' }}>
                    <div className="row space-between" style={{ alignItems: 'center' }}>
                      <h2 className="heading-md" style={{ margin: 0 }}>Community Impact</h2>
                      <button type="button" className="button button-muted button-sm" onClick={() => setImpactModal({ open: false, businessName: '', loading: false, error: '', data: null })}>Close</button>
                    </div>
                    <p className="subtitle" style={{ marginTop: '6px' }}>{impactModal.businessName}</p>
                    {impactModal.loading ? <p className="muted-text">Loading verified actions...</p> : null}
                    {impactModal.error ? <div className="alert alert-error">{impactModal.error}</div> : null}
                    {impactModal.data ? (
                      <div className="stack-sm" style={{ marginTop: '10px' }}>
                        <p className="text-strong">Community Impact: {impactModal.data?.verified_count || 0} Verified Actions</p>
                        {(impactModal.data?.verified_badges || []).length === 0 ? (
                          <p className="muted-text">No verified badges have been published yet.</p>
                        ) : (
                          (impactModal.data?.verified_badges || []).map((item) => (
                            <div key={item.id} className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
                              <p className="text-strong">{item.name}</p>
                              <p className="muted-text" style={{ marginTop: '4px' }}>{item.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {totalBusinesses > 0 && (
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <p className="muted-text">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="row" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="button button-sm button-muted"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="button button-sm button-primary"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showSoftGate ? (
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
          <div className="card card--medium" style={{ width: '100%', maxWidth: '460px' }}>
            <h2 className="heading-lg" style={{ marginBottom: '8px' }}>Create a free supporter account</h2>
            <p className="subtitle">View full business profiles and follow businesses you want to support.</p>
            <div className="stack-sm" style={{ marginTop: '18px' }}>
              <button type="button" className="button button-primary button-full" onClick={() => onNavigate('customer-signup')}>
                Create free account
              </button>
              <button type="button" className="button button-secondary button-full" onClick={() => onNavigate('customer-login')}>
                Log in
              </button>
              <button type="button" className="button button-muted button-full" onClick={() => setShowSoftGate(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const FavoritesPage = ({ onNavigate, onLogout, customer }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.get('/customers/favorites');
      setFavorites(response.data?.favorites || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load favorites.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (businessId) => {
    try {
      await customerApi.delete(`/customers/favorites/${businessId}`);
      setFavorites((prev) => prev.filter((item) => item.id !== businessId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to remove favorite.'));
    }
  };
  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <CustomerNav onNavigate={onNavigate} onLogout={onLogout} activeScreen="favorites" customer={customer} />
          <BackLink fallbackPath="/discover" onFallbackNavigate={() => onNavigate('discover')} />
          <h1 className="heading-lg">My Favorites</h1>
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <p className="muted-text" style={{ marginTop: '16px' }}>Loading favorites...</p>
          ) : (
            <div className="stack-md">
              {favorites.map((business) => (
                <div key={business.id} className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none', padding: '20px' }}>
                  <div className="row space-between row-wrap" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <p className="heading-md">{business.name}</p>
                      <p className="subtitle">{business.tagline || 'No tagline available.'}</p>
                      <p className="muted-text">Status: {business.verification_status || 'unknown'}</p>
                    </div>
                    <div className="row" style={{ gap: '8px' }}>
                      <button type="button" className="button button-muted button-sm" onClick={() => onNavigate('public-route', business.slug)}>
                        View Profile
                      </button>
                      <button type="button" className="button button-secondary button-sm" onClick={() => removeFavorite(business.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {favorites.length === 0 && <p className="muted-text">No favorites saved yet.</p>}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const CustomerProfilePage = ({ onNavigate, onLogout, customer, onCustomerUpdated, initialMessage = '' }) => {
  const [formData, setFormData] = useState({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || ''
    });
  }, [customer]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };



  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await customerApi.put('/customers/profile', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address
      });
      onCustomerUpdated(response.data.customer);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update profile.'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <CustomerNav onNavigate={onNavigate} onLogout={onLogout} activeScreen="customer-profile" customer={customer} />
          <BackLink fallbackPath="/discover" onFallbackNavigate={() => onNavigate('discover')} />
          <h1 className="heading-lg">My Profile</h1>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <div className="stack-md" style={{ marginTop: '16px' }}>
            <div className="field">
              <label className="label">First name</label>
              <input className="input" type="text" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Last name</label>
              <input className="input" type="text" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" value={formData.email} readOnly />
            </div>
            <div className="field">
              <label className="label">Phone</label>
              <input className="input" type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Address</label>
              <textarea className="input" rows="3" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} />
            </div>
            <button type="button" className="button button-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// BUSINESS FORGOT PASSWORD
// =============================================================================

const BusinessForgotPassword = ({ onNavigate, initialMessage = '' }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data?.message || 'If that email exists, we sent a reset link.');
    } catch (err) {
      setMessage('If that email exists, we sent a reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('login')} />
        <div className="stack-sm text-center">
          <h1 className="heading-xl">Reset your password</h1>
          <p className="subtitle">We&apos;ll email you a secure reset link.</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert">{message}</div>}
        <div className="stack-md">
          <div className="field">
            <label className="label" htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@business.com"
            />
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// BUSINESS RESET PASSWORD
// =============================================================================

const BusinessResetPassword = ({ onNavigate, token, initialMessage = '' }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');

  const passwordInvalid = password && !PASSWORD_REGEX.test(password);
  const confirmMismatch = confirmPassword && password !== confirmPassword;

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!token) {
      setError('Reset token is missing.');
      return;
    }
    if (!password) {
      setError('Please enter your new password.');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_HELPER);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      setMessage(response.data?.message || 'Password updated successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to reset password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('login')} />
        <div className="stack-sm text-center">
          <h1 className="heading-xl">Choose a new password</h1>
          <p className="subtitle">Your new password must meet our security requirements.</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert">{message}</div>}
        <div className="stack-md">
          <div className="field">
            <label className="label" htmlFor="reset-password">New Password</label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Create a new password"
            />
            {passwordInvalid && <span className="field-error">{PASSWORD_HELPER}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="reset-confirm-password">Confirm Password</label>
            <input
              id="reset-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Re-enter your new password"
            />
            {confirmMismatch && <span className="field-error">Passwords do not match.</span>}
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="button button-primary button-full">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </div>
        <p className="helper-text text-center">
          Remembered your password?{' '}
          <button type="button" onClick={() => onNavigate('login')} className="link-button link-button--inline">
            Back to login
          </button>
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// BUSINESS DASHBOARD
// =============================================================================

const BusinessAccountMenu = ({ businessName, onNavigate, onLogout }) => {
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
};

const BusinessDashboard = ({ business, onNavigate, onLogout, onRefresh }) => {
  const PHILANTHROPIC_MAX_LENGTH = 300;
  const [socials, setSocials] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempUrl, setTempUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [socialFieldErrorIndex, setSocialFieldErrorIndex] = useState(null);
  const [socialFieldError, setSocialFieldError] = useState('');
  const [philanthropicContentType, setPhilanthropicContentType] = useState('philanthropic_goals');
  const [philanthropicValues, setPhilanthropicValues] = useState({
    mission_statement: '',
    vision_statement: '',
    philanthropic_goals: '',
  });
  const [supportSaving, setSupportSaving] = useState(false);
  const [warning, setWarning] = useState(null);
  const [actionError, setActionError] = useState('');

  const verificationStatus = business.verification_status;
  const nudgeMessage = business.nudge_message;
  const policyText = business.policy_violation_text;
  const policyCode = business.policy_violation_code;
  const lastNudgeAt = business.last_nudge_at;
  const canEditBusiness = ['active', 'flagged'].includes(verificationStatus);
  const canEditPhilanthropic = canEditBusiness;
  const showStatusBanner = ['flagged', 'suspended', 'disabled'].includes(verificationStatus);
  const statusBannerMessage =
    nudgeMessage ||
    policyText ||
    (verificationStatus === 'flagged'
      ? 'Your account requires review. Please confirm your details and respond to the latest request.'
      : verificationStatus === 'suspended'
      ? 'Your account is suspended while we review a policy issue.'
      : 'Your account is disabled. Please contact support if you believe this is a mistake.');

  const isSuspended = verificationStatus === 'suspended';
  const isReadOnly = !canEditBusiness;

  const {
    showComplianceBanner,
    bannerMessage,
    bannerPolicyCode,
    bannerPolicyText,
    bannerTimestamp,
  } = useMemo(() => {
    if (!warning) {
      return {
        showComplianceBanner: false,
        bannerMessage: '',
        bannerPolicyCode: '',
        bannerPolicyText: '',
        bannerTimestamp: null,
      };
    }
    return {
      showComplianceBanner: Boolean(warning.message || warning.policy),
      bannerMessage: warning.message || '',
      bannerPolicyCode: warning.policy?.code || '',
      bannerPolicyText: warning.policy?.text || '',
      bannerTimestamp: warning.lastNudgeAt || null,
    };
  }, [warning]);

  useEffect(() => {
    setSocials(Array.isArray(business.socials) ? business.socials : []);
    setPhilanthropicValues({
      mission_statement: business.mission_statement || '',
      vision_statement: business.vision_statement || '',
      philanthropic_goals: business.philanthropic_goals || '',
    });
  }, [business]);

  const handleCopyLink = () => {
    const link = `https://follow-us-everywhere-web.onrender.com/b/${business.slug}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(() => {
        alert(`Failed to copy. Link: ${link}`);
      });
  };

  const handleEdit = (index) => {
    if (!canEditBusiness) {
      return;
    }
    setSocialFieldError('');
    setSocialFieldErrorIndex(null);
    setEditingIndex(index);
    setTempUrl(socials[index]?.url || '');
  };

  const handleSave = async (index) => {
    if (!canEditBusiness) {
      return;
    }
    setSaving(true);
    setActionError('');
    setSocialFieldError('');
    setSocialFieldErrorIndex(null);
    try {
      const social = socials[index];
      if (!social?.id) {
        setActionError('Cannot update/delete this social link because its ID is missing. Please refresh and try again.');
        return;
      }
      const trimmedUrl = tempUrl.trim();
      const nextUrl =
        trimmedUrl && !/^https?:\/\//i.test(trimmedUrl) ? `https://${trimmedUrl}` : trimmedUrl;

      const response = await api.put(`/socials/${social.id}`, {
        url: nextUrl,
        is_active: Boolean(nextUrl),
      });
      if (response.data?.warning?.message) {
        setWarning(response.data.warning);
      }
      setSocials((prev) =>
        prev.map((item, socialIndex) =>
          socialIndex === index
            ? {
                ...item,
                ...(response.data?.socialLink || {}),
                url: response.data?.socialLink?.url ?? nextUrl,
                is_active: response.data?.socialLink?.is_active ?? Boolean(nextUrl),
              }
            : item
        )
      );
      alert(
        response.data?.warning?.message
          ? 'Link updated with a compliance warning.'
          : nextUrl
          ? 'Link updated successfully!'
          : 'Link removed successfully!'
      );
      setEditingIndex(null);
    } catch (err) {
      if (err?.response?.status === 400) {
        setSocialFieldError('Please enter a full link like https://example.com');
        setSocialFieldErrorIndex(index);
      }
      setActionError(getApiErrorMessage(err, 'Failed to update link. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index) => {
    if (!canEditBusiness) {
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const social = socials[index];
      if (!social?.id) {
        setActionError('Cannot remove this social link because its ID is missing. Please refresh and try again.');
        return;
      }
      const response = await api.put(`/socials/${social.id}`, { url: '', is_active: false });
      setSocials((prev) =>
        prev.map((item, socialIndex) =>
          socialIndex === index
            ? {
                ...item,
                ...(response.data?.socialLink || {}),
                url: '',
                is_active: false,
              }
            : item
        )
      );
      if (editingIndex === index) {
        setEditingIndex(null);
      }
      alert('Link removed successfully!');
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to remove link. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCommunitySupport = async () => {
    if (!canEditPhilanthropic) {
      return;
    }
    const selectedValue = philanthropicValues[philanthropicContentType] || '';
    if (selectedValue.length > PHILANTHROPIC_MAX_LENGTH) {
      setActionError('Content must be 300 characters or fewer.');
      return;
    }
    setSupportSaving(true);
    setActionError('');
    try {
      const payload = {
        [philanthropicContentType]: selectedValue,
      };
      await api.put('/businesses/profile/update', payload);
      alert('Philanthropic content updated successfully!');
      onRefresh();
    } catch (err) {
      if (err?.response?.status === 400) {
        setActionError('Content must be 300 characters or fewer.');
        return;
      }
      setActionError(getApiErrorMessage(err, 'Failed to update philanthropic content. Please try again.'));
    } finally {
      setSupportSaving(false);
    }
  };
  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <div className="dashboard-header">
            <h1 className="heading-lg">Dashboard</h1>
            <BusinessAccountMenu businessName={business.name} onNavigate={onNavigate} onLogout={onLogout} />
          </div>
          <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('dashboard')} />
          {showComplianceBanner && (
            <div className={`banner ${isSuspended ? 'banner-warning' : 'banner-info'}`}>
              <div className="stack-sm">
                <strong>{isSuspended ? 'Account suspended' : 'Admin nudge'}</strong>
                {bannerMessage && <p className="banner-text">{bannerMessage}</p>}
                <div className="banner-meta">
                  {bannerPolicyCode && (
                    <span>
                      Policy {bannerPolicyCode}: {bannerPolicyText}
                    </span>
                  )}
                  {bannerTimestamp && (
                    <span>Last nudge: {new Date(bannerTimestamp).toLocaleString()}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('contact', {
                      name: business.name,
                      email: business.email,
                      business: business.slug,
                      reason: 'Appeal / policy clarification',
                    })
                  }
                  className="button button-secondary button-sm"
                >
                  Contact support
                </button>
              </div>
            </div>
          )}
          <div className="stack-sm">
            <h2 className="heading-md">{business.name}</h2>
            <p className="subtitle">{business.tagline}</p>
          </div>
          {actionError && <div className="alert alert-error">{actionError}</div>}
          {showStatusBanner && (
            <div className="alert alert-error">
              <p className="text-strong">
                {verificationStatus === 'flagged'
                  ? 'Account flagged for review'
                  : verificationStatus === 'suspended'
                  ? 'Account suspended'
                  : 'Account disabled'}
              </p>
              <p>{statusBannerMessage}</p>
              {nudgeMessage && nudgeMessage !== statusBannerMessage && <p>{nudgeMessage}</p>}
              {policyText && policyText !== statusBannerMessage && (
                <p className="muted-text">Policy details: {policyText}</p>
              )}
              {policyCode && (
                <p className="muted-text">Policy reference: {policyCode}</p>
              )}
              {lastNudgeAt && (
                <p className="muted-text">Last update: {new Date(lastNudgeAt).toLocaleString()}</p>
              )}
            </div>
          )}
          <div className="callout">
            <p className="subtitle">Your Follow Us Everywhere link:</p>
            <div className="row row-wrap">
              <code className="code-block">
                https://follow-us-everywhere-web.onrender.com/b/{business.slug}
              </code>
              <button type="button" onClick={handleCopyLink} className="button button-primary button-sm">
                Copy Link
              </button>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('public', business.slug)} className="button button-secondary button-full">
            Preview Public Follow Page
          </button>
          <h2 className="heading-md">Your Social Profiles</h2>
          {!canEditBusiness && (
            <div className="alert alert-error">
              Social link updates are disabled while your account is suspended or disabled.
            </div>
          )}
          <div className="stack-sm">
            {socials.map((social, index) => (
              <div key={social.id || index} className="social-card">
                <div className="row space-between">
                  <div className="row">
                    <span className="social-icon">{social.icon}</span>
                    <span className="text-strong">{social.platform}</span>
                  </div>
                  <div className="row">
                    {editingIndex === index ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSave(index)}
                          disabled={saving}
                          className="link-button link-button--success"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setEditingIndex(null)} className="link-button">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEdit(index)}
                          className="link-button link-button--inline"
                          disabled={!canEditBusiness}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          className="link-button"
                          disabled={!canEditBusiness || saving}
                        >
                          {saving ? 'Removing...' : 'Remove link'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingIndex === index ? (
                  <>
                    <input
                      type="text"
                      value={tempUrl}
                      onChange={(e) => {
                        setTempUrl(e.target.value);
                        if (socialFieldErrorIndex === index) {
                          setSocialFieldError('');
                          setSocialFieldErrorIndex(null);
                        }
                      }}
                      className="input"
                      placeholder={`https://${social.platform.toLowerCase()}.com/yourhandle`}
                      disabled={!canEditBusiness}
                    />
                    {socialFieldErrorIndex === index && socialFieldError && (
                      <p className="muted-text" role="alert">{socialFieldError}</p>
                    )}
                  </>
                ) : (
                  <p className="muted-text truncate">
                    {social.is_active ? social.url || `Add your ${social.platform} link` : 'Not set'}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="section-divider" />
          <div className="stack-sm">
            <h2 className="heading-md">Philanthropic</h2>
            {!canEditPhilanthropic && (
              <div className="alert alert-error">
                Philanthropic updates are disabled while your account is suspended or disabled.
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="philanthropic-content-select">Select content</label>
              <select
                id="philanthropic-content-select"
                className="input"
                value={philanthropicContentType}
                onChange={(event) => setPhilanthropicContentType(event.target.value)}
                disabled={!canEditPhilanthropic}
              >
                <option value="philanthropic_goals">Philanthropic Goals</option>
                <option value="vision_statement">Vision Statement</option>
                <option value="mission_statement">Mission Statement</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="philanthropic-content-text">Content</label>
              <textarea
                id="philanthropic-content-text"
                className="input textarea"
                value={philanthropicValues[philanthropicContentType] || ''}
                onChange={(event) => {
                  const nextValue = event.target.value.slice(0, PHILANTHROPIC_MAX_LENGTH);
                  setPhilanthropicValues((prev) => ({
                    ...prev,
                    [philanthropicContentType]: nextValue,
                  }));
                }}
                maxLength={PHILANTHROPIC_MAX_LENGTH}
                placeholder="Enter content"
                disabled={!canEditPhilanthropic}
              />
              <p className="muted-text">{(philanthropicValues[philanthropicContentType] || '').length} / {PHILANTHROPIC_MAX_LENGTH}</p>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={handleSaveCommunitySupport}
              disabled={!canEditPhilanthropic || supportSaving}
            >
              {supportSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PUBLIC FOLLOW PAGE
// =============================================================================

const PublicFollowPage = ({ slug, onNavigate }) => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoLoadError, setLogoLoadError] = useState(false);
  const hasBusinessToken = Boolean(localStorage.getItem('token'));
  const publicFallbackPath = hasBusinessToken ? '/business' : '/discover';
  const handlePublicFallback = () => {
    if (hasBusinessToken) {
      onNavigate('dashboard');
      return;
    }
    onNavigate('discover');
  };

  useEffect(() => {
    setLogoLoadError(false);
  }, [business?.logo_url]);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await customerApi.get(`/public/businesses/slug/${encodeURIComponent(slug)}`);
        setBusiness(response.data);
      } catch (err) {
        setError('Business not found');
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [slug]);

  const handlePlatformClick = (platform, url) => {
    if (!url) {
      alert(`${platform} link not configured yet`);
      return;
    }
    window.open(url, '_blank');
  };
  if (loading) {
    return (
      <div className="page">
        <div className="subtitle">Loading...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const publicStatus = business.status || business.verification_status;
  const publicMessage = business.message || '';
  const isPublicRestricted =
    ['suspended', 'disabled'].includes(publicStatus) ||
    publicMessage.toLowerCase().includes('technical difficulties');

  if (isPublicRestricted) {
    return (
      <div className="page page--gradient">
        <div className="card card--medium">
          <BackLink fallbackPath={publicFallbackPath} onFallbackNavigate={handlePublicFallback} />
          <div className="stack-md text-center">
            <h1 className="heading-xl">We&apos;ll be right back</h1>
            <p className="subtitle">This page is temporarily unavailable due to technical difficulties.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeSocials = business.socials.filter((s) => s.url);
  const businessName = (business.name || '').trim();
  const initials = businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
  const logoUrl = toAbsoluteAssetUrl(business.logo_url);
  const showLogoImage = Boolean(logoUrl) && !logoLoadError;
  const badges = Array.isArray(business.badges) ? business.badges : [];
  const missionStatement = business.mission_statement || '';
  const visionStatement = business.vision_statement || '';
  const philanthropicGoals = business.philanthropic_goals || '';
  const statementCards = [
    { title: 'Mission Statement', value: missionStatement },
    { title: 'Vision Statement', value: visionStatement },
    { title: 'Philanthropic Goals', value: philanthropicGoals },
  ].filter((card) => card.value && card.value.trim().length > 0);

  return (
    <div className="page page--gradient public-business-page">
      <header className="public-business-hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="public-business-hero__overlay">
          <div className="public-business-hero__inner">
            <div className="public-business-hero__content text-center">
              {showLogoImage ? (
                <img
                  src={logoUrl}
                  alt={`${businessName || 'Business'} logo`}
                  className="public-business-hero__logo"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <div className="avatar public-business-hero__avatar">{initials}</div>
              )}
              <h1 className="heading-xl public-business-hero__title">{business.name}</h1>
              <p className="subtitle public-business-hero__subtitle">Follow this business everywhere.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="public-business-shell">
        <div className="public-business-layout">
          <section className="card public-business-column" aria-label="Follow links">
            <p className="public-follow-helper">Tap a link to follow</p>
            {activeSocials.length === 0 ? (
              <div className="empty-state">This business hasn't added their social links yet.</div>
            ) : (
              <>
                <div className="stack-sm">
                  {business.socials.map((social, index) =>
                    social.url ? (
                      <button
                        key={social.id || index}
                        type="button"
                        onClick={() => handlePlatformClick(social.platform, social.url)}
                        className="button button-muted button-full button-justify"
                      >
                        <span className="row">
                          <span className="social-icon">{social.icon}</span>
                          <span>
                            {social.platform === 'YouTube'
                              ? 'Subscribe on'
                              : social.platform === 'Facebook'
                              ? 'Like on'
                              : social.platform === 'LinkedIn'
                              ? 'Connect on'
                              : social.platform === 'Website'
                              ? 'Visit'
                              : 'Follow on'}{' '}
                            {social.platform}
                          </span>
                        </span>
                        <span className="muted-text">→</span>
                      </button>
                    ) : null
                  )}
                </div>
                {activeSocials.length > 1 && <p className="public-follow-subtitle">Connect with us across the web</p>}
              </>
            )}
            {badges.length > 0 && (
              <div className="public-section">
                <h2 className="heading-md">Community Impact (Verified)</h2>
                <div className="badge-grid">
                  {badges.map((badge) => (
                    <div key={badge.id} className="badge-card">
                      <div className="badge-header">
                        {badge.icon && <span className="badge-icon">{badge.icon}</span>}
                        <div>
                          <p className="text-strong">{badge.name}</p>
                          <p className="muted-text">{badge.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card public-business-column public-business-right" aria-label="Statements">
            {statementCards.length === 0 ? (
              <div className="statement-card statement-card--placeholder">No statements provided yet.</div>
            ) : (
              <div className={`statement-cards statement-cards--${statementCards.length === 1 ? 'single' : 'stacked'}`}>
                {statementCards.map((card) => (
                  <article key={card.title} className="statement-card">
                    <h2 className="heading-md">{card.title}</h2>
                    <p className="muted-text">{card.value}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};


const BusinessProfilePage = ({ business, onNavigate, onLogout, onBusinessUpdated }) => {
  const [formData, setFormData] = useState({
    name: business?.name || '',
    tagline: business?.tagline || '',
    logo: business?.logo_url || '',
    laraNumber: '',
  });
  const [logoPreview, setLogoPreview] = useState(toAbsoluteAssetUrl(business?.logo_url));
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [badgeCatalog, setBadgeCatalog] = useState([]);
  const [businessDocuments, setBusinessDocuments] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [requestForm, setRequestForm] = useState({ badge_id: '', business_notes: '', linked_document_id: '' });
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState('');
  const [documentType, setDocumentType] = useState('incorporation');
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const documentFileInputRef = useRef(null);

  useEffect(() => {
    setFormData({
      name: business?.name || '',
      tagline: business?.tagline || '',
      logo: business?.logo_url || '',
      laraNumber: '',
    });
    setLogoPreview(toAbsoluteAssetUrl(business?.logo_url));
    setLogoPreviewError(false);
  }, [business]);


  const loadBadgeData = async () => {
    try {
      const [catalogRes, docsRes, requestsRes] = await Promise.all([
        api.get('/badges'),
        api.get('/business/documents'),
        api.get('/business/badge-requests')
      ]);
      setBadgeCatalog(Array.isArray(catalogRes.data) ? catalogRes.data : []);
      setBusinessDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
      setRequestHistory(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to load badge request tools.'));
    }
  };

  useEffect(() => {
    loadBadgeData();
  }, []);

  const badgeCategories = useMemo(() => (
    [...new Set(badgeCatalog.map((badge) => badge.category).filter(Boolean))]
  ), [badgeCatalog]);

  const filteredBadges = useMemo(() => (
    badgeCatalog.filter((badge) => !selectedBadgeCategory || badge.category === selectedBadgeCategory)
  ), [badgeCatalog, selectedBadgeCategory]);

  const handleUploadDocument = async () => {
    if (!documentFile) {
      setSaveError('Please choose a file to upload.');
      return;
    }

    setUploadLoading(true);
    setSaveError('');
    setSaveMessage('');

    try {
      const form = new FormData();
      form.append('document_type', documentType);
      form.append('document', documentFile);
      await api.post('/business/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSaveMessage('Document uploaded successfully.');
      setDocumentFile(null);
      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = '';
      }
      await loadBadgeData();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to upload document.'));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId, fileName) => {
    try {
      const response = await api.get(`/business/documents/${documentId}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName || `document-${documentId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to download document.'));
    }
  };


  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'logo') {
      setLogoPreview(toAbsoluteAssetUrl(value));
      setLogoPreviewError(false);
    }
  };

  const handleLogoFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadLoading(true);
    setSaveError('');
    setSaveMessage('');

    try {
      const form = new FormData();
      form.append('logo', file);
      const response = await api.post('/business/logo/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedLogoUrl = response.data?.logo_url || '';
      const absoluteUploadedLogoUrl = toAbsoluteAssetUrl(uploadedLogoUrl);
      setFormData((prev) => ({ ...prev, logo: uploadedLogoUrl }));
      setLogoPreview(absoluteUploadedLogoUrl);
      setLogoPreviewError(false);
      onBusinessUpdated((prev) => ({
        ...prev,
        logo_url: uploadedLogoUrl,
      }));
      setSaveMessage('Logo uploaded successfully.');
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to upload logo.'));
    } finally {
      setUploadLoading(false);
      event.target.value = '';
    }
  };


  const handleSubmitBadgeRequest = async () => {
    if (!requestForm.badge_id) {
      setSaveError('Please select a category and badge to request.');
      return;
    }

    setRequestLoading(true);
    setSaveError('');
    setSaveMessage('');

    try {
      await api.post('/business/badges/request', {
        badge_id: Number(requestForm.badge_id),
        business_notes: requestForm.business_notes || null,
        linked_document_id: requestForm.linked_document_id ? Number(requestForm.linked_document_id) : null
      });
      setSaveMessage('Badge request submitted. Submitted by business, pending admin verification.');
      setRequestForm({ badge_id: '', business_notes: '', linked_document_id: '' });
      await loadBadgeData();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to submit badge request.'));
    } finally {
      setRequestLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const response = await api.put('/businesses/profile/update', {
        name: formData.name,
        tagline: formData.tagline,
        logo_url: formData.logo,
      });
      onBusinessUpdated((prev) => ({
        ...prev,
        name: response.data?.business?.name ?? formData.name,
        tagline: response.data?.business?.tagline ?? formData.tagline,
        logo_url: response.data?.business?.logo_url ?? formData.logo,
      }));
      setSaveMessage('Profile saved. LARA number saved once verification is enabled.');
    } catch (err) {
      if (err?.response?.status === 404) {
        setSaveMessage('Profile saving is not enabled yet.');
      } else {
        setSaveError(getApiErrorMessage(err, 'Unable to save profile right now.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const profileBusinessName = (formData.name || business?.name || '').trim();
  const profileInitials = profileBusinessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <div className="dashboard-header">
            <h1 className="heading-lg">Business Profile</h1>
            <BusinessAccountMenu businessName={business?.name || 'Business'} onNavigate={onNavigate} onLogout={onLogout} />
          </div>
          <button type="button" className="link-button" onClick={() => onNavigate('dashboard', null, '/business')}>
            ← Back
          </button>
          {saveMessage && <div className="alert alert-success">{saveMessage}</div>}
          {saveError && <div className="alert alert-error">{saveError}</div>}

          <div className="stack-md" style={{ marginTop: '14px' }}>
            <div className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
              <h2 className="heading-md">Profile details</h2>
              <div className="field" style={{ marginTop: '14px' }}>
                <label className="label">Business Name</label>
                <input className="input" type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Tagline</label>
                <input className="input" type="text" value={formData.tagline} onChange={(e) => handleChange('tagline', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Logo URL</label>
                <input
                  className="input"
                  type="url"
                  value={formData.logo}
                  onChange={(e) => handleChange('logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="field">
                <label className="label">Upload logo image</label>
                <input className="input" type="file" accept="image/*" onChange={handleLogoFileChange} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <p className="muted-text" style={{ marginBottom: '8px' }}>Logo preview</p>
                {logoPreview && !logoPreviewError ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    onError={() => setLogoPreviewError(true)}
                    style={{ maxWidth: '140px', maxHeight: '140px', borderRadius: '10px', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div className="avatar" style={{ width: '72px', height: '72px', fontSize: '1.1rem' }}>{profileInitials}</div>
                )}
              </div>
              <div className="field" style={{ marginTop: '14px' }}>
                <label className="label">LARA / Articles of Incorporation Number</label>
                <input className="input" type="text" value={formData.laraNumber} onChange={(e) => handleChange('laraNumber', e.target.value)} />
                <p className="helper-text">Used for verification review</p>
                <p className="muted-text">Saved once verification is enabled.</p>
              </div>
              <button type="button" className="button button-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>

            <div className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
              <h2 className="heading-md">Documents / uploads</h2>
              <div className="field" style={{ marginTop: '14px' }}>
                <label className="label">Document type</label>
                <select className="input" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="lara">LARA</option>
                  <option value="incorporation">Incorporation</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label className="label">File</label>
                <input
                  ref={documentFileInputRef}
                  className="input"
                  type="file"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                />
              </div>
              <button type="button" className="button button-primary" onClick={handleUploadDocument} disabled={uploadLoading}>
                {uploadLoading ? 'Uploading...' : 'Upload document'}
              </button>

              <div style={{ marginTop: '16px' }}>
                <h3 className="heading-sm">Uploaded documents</h3>
                {businessDocuments.length === 0 ? (
                  <p className="muted-text">No documents uploaded yet.</p>
                ) : (
                  <div className="stack-sm">
                    {businessDocuments.map((doc) => (
                      <div key={doc.id} className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
                        <p className="muted-text">Type: {doc.documentType}</p>
                        <p className="muted-text">Filename: {doc.originalFileName}</p>
                        <p className="muted-text">Status: {doc.status}</p>
                        <p className="muted-text">Submitted: {doc.submittedAt ? new Date(doc.submittedAt).toLocaleString() : '—'}</p>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleDownloadDocument(doc.id, doc.originalFileName)}
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
              <h2 className="heading-md">Community Impact badge requests</h2>
              <p className="subtitle">
                Official recognition with uplifting impact. Only admin-approved badges appear publicly.
              </p>
              <div className="field" style={{ marginTop: '14px' }}>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={selectedBadgeCategory}
                  onChange={(e) => {
                    const nextCategory = e.target.value;
                    setSelectedBadgeCategory(nextCategory);
                    setRequestForm((prev) => ({ ...prev, badge_id: '' }));
                  }}
                >
                  <option value="">Choose a category</option>
                  {badgeCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Badge</label>
                <select
                  className="input"
                  value={requestForm.badge_id}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, badge_id: e.target.value }))}
                  disabled={!selectedBadgeCategory}
                >
                  <option value="">Choose a badge</option>
                  {filteredBadges.map((badgeItem) => (
                    <option key={badgeItem.id} value={badgeItem.id}>{badgeItem.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Impact notes (optional)</label>
                <textarea
                  className="input"
                  rows="3"
                  value={requestForm.business_notes}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, business_notes: e.target.value }))}
                  placeholder="Share your action and why it matters to the community."
                />
              </div>
              <div className="field">
                <label className="label">Supporting document</label>
                <select
                  className="input"
                  value={requestForm.linked_document_id}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, linked_document_id: e.target.value }))}
                >
                  <option value="">No supporting document</option>
                  {businessDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.documentType} — {doc.originalFileName} ({doc.status})</option>
                  ))}
                </select>
              </div>
              <button type="button" className="button button-secondary" onClick={handleSubmitBadgeRequest} disabled={requestLoading}>
                {requestLoading ? 'Submitting...' : 'Submit badge request'}
              </button>

              <div style={{ marginTop: '16px' }}>
                <h3 className="heading-sm">Request history</h3>
                {requestHistory.length === 0 ? (
                  <p className="muted-text">No requests submitted yet.</p>
                ) : (
                  <div className="stack-sm">
                    {requestHistory.map((item) => (
                      <div key={item.id} className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
                        <p className="text-strong">{item.badgeName}</p>
                        <p className="muted-text">Status: {item.status}</p>
                        <p className="muted-text">Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '—'}</p>
                        {item.status === 'Approved' ? <p className="muted-text">Granted ✅</p> : null}
                        {item.businessNotes ? <p className="muted-text">Business notes: {item.businessNotes}</p> : null}
                        {item.adminNotes ? <p className="muted-text">Admin notes: {item.adminNotes}</p> : null}
                        {item.rejectionReason ? <p className="muted-text">Rejection reason: {item.rejectionReason}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CONTACT SUPPORT
// =============================================================================

const ContactSupport = ({ onNavigate, prefill }) => {
  const [formData, setFormData] = useState({
    name: prefill?.name || '',
    email: prefill?.email || '',
    business: prefill?.business || '',
    reason: prefill?.reason || '',
    message: '',
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setStatus({ loading: true, error: '', success: '' });
    try {
      await api.post('/support/contact', formData);
      setStatus({ loading: false, error: '', success: 'Message sent. Our team will follow up shortly.' });
      setFormData((prev) => ({ ...prev, message: '' }));
    } catch (err) {
      setStatus({
        loading: false,
        error: err.response?.data?.message || 'Failed to send. Please try again.',
        success: '',
      });
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <BackLink fallbackPath="/business" onFallbackNavigate={() => onNavigate('dashboard')} />
        <div className="stack-sm text-center">
          <h1 className="heading-xl">Contact Support</h1>
          <p className="subtitle">Tell us what you need help with.</p>
        </div>
        {status.error && <div className="alert alert-error">{status.error}</div>}
        {status.success && <div className="alert alert-success">{status.success}</div>}
        <div className="stack-md">
          <div className="field">
            <label className="label" htmlFor="support-name">Name</label>
            <input
              id="support-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="support-email">Email</label>
            <input
              id="support-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="support-business">Business name or slug</label>
            <input
              id="support-business"
              type="text"
              value={formData.business}
              onChange={(e) => handleChange('business', e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="support-reason">Reason</label>
            <input
              id="support-reason"
              type="text"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              className="input"
              placeholder="e.g., Suspension appeal"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="support-message">Message</label>
            <textarea
              id="support-message"
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              className="input"
              rows="4"
            />
          </div>
          <button type="button" onClick={handleSubmit} disabled={status.loading} className="button button-primary button-full">
            {status.loading ? 'Sending...' : 'Send message'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN APP
// =============================================================================

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('marketing-landing');
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [publicSlug, setPublicSlug] = useState(null);
  const [contactPrefill, setContactPrefill] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [customerResetToken, setCustomerResetToken] = useState(null);
  const [customerLoginMessage, setCustomerLoginMessage] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [roleModalMode, setRoleModalMode] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const hasCustomerToken = () => Boolean(localStorage.getItem('customer_token'));
  const isCustomerOrPublicPath = (pathname) =>
    pathname === '/customer' ||
    pathname.startsWith('/customer/') ||
    pathname === '/discover' ||
    pathname === '/favorites' ||
    (pathname.startsWith('/business/') && pathname !== '/business/profile') || pathname.startsWith('/b/');

  const isBusinessPath = (pathname) => pathname === '/business' || pathname.startsWith('/business/');

  const getScreenFromPath = (pathname) => {
    if (pathname === '/') return 'marketing-landing';
    if (pathname === '/about') return 'about';
    if (pathname === '/faq') return 'faq';
    if (pathname === '/business') return 'dashboard';
    if (pathname === '/business/profile') return 'business-profile';
    if (pathname === '/reset-password') return 'reset';
    if (pathname === '/customer' || pathname === '/customer/login') return 'customer-login';
    if (pathname === '/customer/signup') return 'customer-signup';
    if (pathname === '/customer/forgot-password') return 'customer-forgot';
    if (pathname === '/customer/reset-password') return 'customer-reset';
    if (pathname === '/discover') return 'discover';
    if (pathname === '/favorites') return 'favorites';
    if (pathname === '/customer/profile') return 'customer-profile';
    if (pathname.startsWith('/b/')) return 'public';
    if (pathname.startsWith('/business/')) return 'public';
    return null;
  };

  const syncScreenWithPath = (path) => {
    const parsedUrl = new URL(path, window.location.origin);
    const { pathname, search } = parsedUrl;
    const mappedScreen = getScreenFromPath(pathname);

    if (pathname === '/customer') {
      window.history.replaceState({}, '', '/customer/login');
      setCurrentScreen('customer-login');
      return 'customer-login';
    }

    if (pathname === '/reset-password') {
      const params = new URLSearchParams(search);
      setResetToken(params.get('token'));
    }

    if (pathname === '/customer/reset-password') {
      const params = new URLSearchParams(search);
      setCustomerResetToken(params.get('token'));
    }

    if (pathname.startsWith('/b/')) {
      const slug = pathname.replace('/b/', '').trim();
      if (slug) {
        setPublicSlug(slug);
      }
    }

    if (pathname.startsWith('/business/') && pathname !== '/business/profile') {
      const slug = pathname.replace('/business/', '').trim();
      if (slug) {
        setPublicSlug(slug);
      }
    }

    if (mappedScreen) {
      setCurrentScreen(mappedScreen);
    }

    return mappedScreen;
  };

  useEffect(() => {
    const { pathname, search } = window.location;

    const mappedScreen = syncScreenWithPath(`${pathname}${search}`);

    const token = localStorage.getItem('token');
    if (token && isBusinessPath(pathname) && !isCustomerOrPublicPath(pathname)) {
      fetchCurrentBusiness(mappedScreen);
    }

    if (hasCustomerToken()) {
      fetchCurrentCustomer();
    }

    const handlePopState = () => {
      syncScreenWithPath(`${window.location.pathname}${window.location.search}`);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const fetchCurrentBusiness = async (targetScreen = null) => {
    try {
      const response = await api.get('/auth/me');
      setCurrentBusiness(response.data);
      if (targetScreen === 'business-profile') {
        setCurrentScreen('business-profile');
      } else {
        setCurrentScreen('dashboard');
      }
    } catch (err) {
      localStorage.removeItem('token');
    }
  };

  const fetchCurrentCustomer = async () => {
    try {
      const response = await customerApi.get('/customers/auth/me');
      setCurrentCustomer(response.data);
    } catch (err) {
      localStorage.removeItem('customer_token');
      setCurrentCustomer(null);
    }
  };

  const handleNavigate = (screen, data = null, path = null) => {
    if (path) {
      window.history.pushState({}, '', path);
      setCurrentScreen(getScreenFromPath(new URL(path, window.location.origin).pathname) || screen);
    } else {
      setCurrentScreen(screen);
    }
    if (screen === 'public') {
      setPublicSlug(data);
    }
    if (screen === 'contact') {
      setContactPrefill(data);
    } else {
      setContactPrefill(null);
    }
  };

  const handleCustomerNavigate = (screen, data = null) => {
    if (screen === 'customer-login') {
      return handleNavigate(screen, null, '/customer/login');
    }
    if (screen === 'customer-signup') {
      return handleNavigate(screen, null, '/customer/signup');
    }
    if (screen === 'customer-forgot') {
      return handleNavigate(screen, null, '/customer/forgot-password');
    }
    if (screen === 'customer-reset') {
      return handleNavigate(screen, null, `/customer/reset-password${data ? `?token=${data}` : ''}`);
    }
    if (screen === 'discover') {
      return handleNavigate(screen, null, '/discover');
    }
    if (screen === 'favorites') {
      return handleNavigate(screen, null, '/favorites');
    }
    if (screen === 'customer-profile') {
      return handleNavigate(screen, null, '/customer/profile');
    }
    if (screen === 'public-route') {
      return handleNavigate('public', data, `/b/${data}`);
    }
    return handleNavigate('marketing-landing', null, '/');
  };

  const handleLoginSuccess = (business) => {
    setCurrentBusiness(business);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentBusiness(null);
    setCurrentScreen('landing');
  };

  const handleCustomerLogout = () => {
    localStorage.removeItem('customer_token');
    setCurrentCustomer(null);
    setCurrentScreen('customer-login');
    window.history.pushState({}, '', '/customer/login');
  };

  const handleCustomerAuthSuccess = (customer) => {
    setCustomerLoginMessage('');
    setCurrentCustomer(customer);
  };

  const handleRoleModalChoose = (screen) => {
    setRoleModalMode(null);
    if (screen === 'customer-login') {
      handleNavigate(screen, null, '/customer/login');
      return;
    }
    if (screen === 'customer-signup') {
      handleNavigate(screen, null, '/customer/signup');
      return;
    }
    if (screen === 'login') {
      handleNavigate(screen, null, '/business');
      return;
    }
    if (screen === 'signup') {
      handleNavigate(screen, null, '/business');
    }
  };

  const closeMobileNav = () => setIsMobileNavOpen(false);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'marketing-landing':
        return <MarketingLandingPage onNavigate={handleNavigate} onOpenRoleModal={setRoleModalMode} />;
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'faq':
        return <FAQPage onNavigate={handleNavigate} />;
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'signup':
        return <BusinessSignup onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      case 'login':
        return <BusinessLogin onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      case 'customer-login':
        return <CustomerLogin onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} initialMessage={customerLoginMessage} />;
      case 'customer-signup':
        return <CustomerSignup onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} />;
      case 'customer-forgot':
        return <CustomerForgotPassword onNavigate={handleCustomerNavigate} />;
      case 'customer-reset':
        return (
          <CustomerResetPassword
            onNavigate={handleCustomerNavigate}
            token={customerResetToken}
            onResetSuccess={(message) => {
              setCustomerLoginMessage(message);
              handleCustomerNavigate('customer-login');
            }}
          />
        );
      case 'discover':
        return <DiscoverPage onNavigate={handleCustomerNavigate} onLogout={handleCustomerLogout} customer={currentCustomer} />;
      case 'favorites':
        return hasCustomerToken() ? (
          <FavoritesPage onNavigate={handleCustomerNavigate} onLogout={handleCustomerLogout} customer={currentCustomer} />
        ) : (
          <CustomerLogin onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} />
        );
      case 'customer-profile':
        return hasCustomerToken() ? (
          <CustomerProfilePage
            onNavigate={handleCustomerNavigate}
            onLogout={handleCustomerLogout}
            customer={currentCustomer}
            onCustomerUpdated={setCurrentCustomer}
          />
        ) : (
          <CustomerLogin onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} />
        );
      case 'forgot':
        return <BusinessForgotPassword onNavigate={handleNavigate} />;
      case 'reset':
        return <BusinessResetPassword onNavigate={handleNavigate} token={resetToken} />;
      case 'dashboard':
        return currentBusiness ? (
          <BusinessDashboard
            business={currentBusiness}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onRefresh={fetchCurrentBusiness}
          />
        ) : (
          <LandingPage onNavigate={handleNavigate} />
        );
      case 'business-profile':
        return currentBusiness ? (
          <BusinessProfilePage
            business={currentBusiness}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onBusinessUpdated={setCurrentBusiness}
          />
        ) : (
          <LandingPage onNavigate={handleNavigate} />
        );
      case 'public':
        return <PublicFollowPage slug={publicSlug} onNavigate={handleNavigate} />;
      case 'contact':
        return <ContactSupport onNavigate={handleNavigate} prefill={contactPrefill} />;
      default:
        return <MarketingLandingPage onNavigate={handleNavigate} onOpenRoleModal={setRoleModalMode} />;
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <button type="button" className="link-button site-header__logo" onClick={() => { handleNavigate('marketing-landing', null, '/'); closeMobileNav(); }}>
            Follow Us Everywhere
          </button>
          <button
            type="button"
            className="button button-secondary button-sm site-header__menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
          >
            ☰
          </button>
          <nav className={`site-header__nav${isMobileNavOpen ? ' site-header__nav--open' : ''}`}>
            <button type="button" className="link-button" onClick={() => { handleNavigate('about', null, '/about'); closeMobileNav(); }}>The Platform</button>
            <button type="button" className="link-button" onClick={() => { handleNavigate('faq', null, '/faq'); closeMobileNav(); }}>FAQ</button>
            <button type="button" className="link-button" onClick={() => { handleNavigate('discover', null, '/discover'); closeMobileNav(); }}>Explore businesses</button>
            <button type="button" className="link-button" onClick={() => { setRoleModalMode('login'); closeMobileNav(); }}>Log in</button>
            <button type="button" className="button button-primary button-sm" onClick={() => { setRoleModalMode('signup'); closeMobileNav(); }}>Sign up free</button>
          </nav>
        </div>
      </header>

      <div className="app-shell__content">{renderScreen()}</div>

      <footer className="site-footer" aria-label="Site footer">
        <div className="site-footer__inner">
          <div className="site-footer__column">
            <h3 className="site-footer__heading">Follow Us Everywhere</h3>
            <p className="site-footer__text">One Smart Business Link For Links, Socials, And Customer Connection</p>
          </div>
          <div className="site-footer__column">
            <h4 className="site-footer__heading">Platform</h4>
            <button type="button" className="site-footer__link" onClick={() => handleNavigate('about', null, '/about')}>About</button>
            <button type="button" className="site-footer__link" onClick={() => handleNavigate('faq', null, '/faq')}>FAQ</button>
            <button type="button" className="site-footer__link" onClick={() => handleNavigate('discover', null, '/discover')}>Explore businesses</button>
          </div>
          <div className="site-footer__column">
            <h4 className="site-footer__heading">Account</h4>
            <button type="button" className="site-footer__link" onClick={() => setRoleModalMode('signup')}>Sign up free</button>
            <button type="button" className="site-footer__link" onClick={() => setRoleModalMode('login')}>Log in</button>
          </div>
          <div className="site-footer__column">
            <h4 className="site-footer__heading">Legal</h4>
            <span className="site-footer__text">Privacy (coming soon)</span>
            <span className="site-footer__text">Terms (coming soon)</span>
          </div>
        </div>
      </footer>

      {roleModalMode ? (
        <RoleChooserModal
          mode={roleModalMode}
          onClose={() => setRoleModalMode(null)}
          onChoose={handleRoleModalChoose}
        />
      ) : null}
    </div>
  );
}
