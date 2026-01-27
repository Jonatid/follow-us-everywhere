// =============================================================================
// COMPLETE API-CONNECTED APP.JS
// =============================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// API base URL (override with VITE_API_BASE_URL at build time if needed).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://followuseverywhere-api.onrender.com/api';

// =============================================================================
// API SERVICE
// =============================================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// =============================================================================
// LANDING PAGE
// =============================================================================

const LandingPage = ({ onNavigate }) => (
  <div className="page page--gradient">
    <div className="card card--wide text-center">
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

// =============================================================================
// BUSINESS SIGNUP
// =============================================================================

const BusinessSignup = ({ onNavigate, onLoginSuccess }) => {
  const [formData, setFormData] = useState({ name: '', slug: '', tagline: '', email: '', password: '' });
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

    setLoading(true);
    try {
      const response = await api.post('/auth/signup', formData);
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
        <button type="button" onClick={() => onNavigate('landing')} className="link-button">← Back</button>
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
        <button type="button" onClick={() => onNavigate('landing')} className="link-button">← Back</button>
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
// BUSINESS DASHBOARD
// =============================================================================

const BusinessDashboard = ({ business, onNavigate, onLogout, onRefresh }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempUrl, setTempUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);

  const isSuspended = business.verification_status === 'suspended';
  const isDisabled = business.verification_status === 'disabled';
  const isReadOnly = isSuspended || isDisabled;

  useEffect(() => {
    if (business.verification_status === 'active') {
      setWarning(null);
    }
  }, [business.verification_status]);

  const handleCopyLink = () => {
    const link = `https://follow-us-everywhere-web.onrender.com/${business.slug}`;
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
    if (isReadOnly) {
      return;
    }
    setEditingIndex(index);
    setTempUrl(business.socials[index].url);
  };

  const handleSave = async (index) => {
    if (isReadOnly) {
      return;
    }
    setSaving(true);
    try {
      const social = business.socials[index];
      const response = await api.put(`/socials/${social.id}`, { url: tempUrl });
      if (response.data?.warning?.message) {
        setWarning(response.data.warning);
      }
      alert(response.data?.warning?.message ? 'Link updated with a compliance warning.' : 'Link updated successfully!');
      setEditingIndex(null);
      onRefresh();
    } catch (err) {
      alert(`Failed to update link: ${err.response?.data?.error || err.response?.data?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const showComplianceBanner =
    business.verification_status === 'flagged' || business.verification_status === 'suspended';
  const bannerMessage = business.nudge_message || warning?.message;
  const bannerPolicyCode = business.policy_violation_code || warning?.policy?.code;
  const bannerPolicyText = business.policy_violation_text || warning?.policy?.text;
  const bannerTimestamp = business.last_nudge_at || warning?.lastNudgeAt;

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <div className="dashboard-header">
            <h1 className="heading-lg">Dashboard</h1>
            <button type="button" onClick={onLogout} className="link-button link-button--inline">Logout</button>
          </div>
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
          <div className="callout">
            <p className="subtitle">Your Follow Us Everywhere link:</p>
            <div className="row row-wrap">
              <code className="code-block">
                https://follow-us-everywhere-web.onrender.com/{business.slug}
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
          {isReadOnly && (
            <div className="callout">
              <p className="subtitle">Your account is read-only while under review.</p>
              <button
                type="button"
                onClick={() =>
                  onNavigate('contact', {
                    name: business.name,
                    email: business.email,
                    business: business.slug,
                    reason: 'Account suspension appeal',
                  })
                }
                className="button button-secondary button-sm"
              >
                Contact support
              </button>
            </div>
          )}
          <div className="stack-sm">
            {business.socials.map((social, index) => (
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
                      <button
                        type="button"
                        onClick={() => handleEdit(index)}
                        className="link-button link-button--inline"
                        disabled={isReadOnly}
                      >
                        {isReadOnly ? 'Read-only' : 'Edit'}
                      </button>
                    )}
                  </div>
                </div>
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    className="input"
                    disabled={isReadOnly}
                    placeholder={`https://${social.platform.toLowerCase()}.com/yourhandle`}
                  />
                ) : (
                  <p className="muted-text truncate">
                    {social.url || `Add your ${social.platform} link`}
                  </p>
                )}
              </div>
            ))}
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

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await api.get(`/businesses/${slug}`);
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

  const handleFollowEverywhere = () => {
    const activeSocials = business.socials.filter((s) => s.url);
    activeSocials.forEach((social) => window.open(social.url, '_blank'));
    alert(`Opened ${activeSocials.length} platforms! Click Follow on each to connect.`);
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

  if (business?.verification_status === 'suspended') {
    return (
      <div className="page page--gradient">
        <div className="card card--medium text-center">
          <h1 className="heading-xl">Technical difficulties, check back later</h1>
        </div>
      </div>
    );
  }

  const activeSocials = business.socials.filter((s) => s.url);

  return (
    <div className="page page--gradient">
      <div className="card card--medium">
        <button type="button" onClick={() => onNavigate('landing')} className="link-button">← Back</button>
        <div className="stack-md text-center">
          <div className="avatar">{business.logo}</div>
          <div>
            <h1 className="heading-xl">{business.name}</h1>
            <p className="subtitle">{business.tagline}</p>
            <p className="muted-text">Follow this business everywhere in two taps.</p>
          </div>
        </div>
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
            {activeSocials.length > 1 && (
              <>
                <button type="button" onClick={handleFollowEverywhere} className="button button-primary button-full">
                  Tap a link to follow
                </button>
                <p className="public-follow-subtitle">Connect with us across the web</p>
              </>
            )}
          </>
        )}
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
        <button type="button" onClick={() => onNavigate('dashboard')} className="link-button">← Back</button>
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
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [publicSlug, setPublicSlug] = useState(null);
  const [contactPrefill, setContactPrefill] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentBusiness();
    }
  }, []);

  const fetchCurrentBusiness = async () => {
    try {
      const response = await api.get('/auth/me');
      setCurrentBusiness(response.data);
      setCurrentScreen('dashboard');
    } catch (err) {
      localStorage.removeItem('token');
    }
  };

  const handleNavigate = (screen, data = null) => {
    setCurrentScreen(screen);
    if (screen === 'public') {
      setPublicSlug(data);
    }
    if (screen === 'contact') {
      setContactPrefill(data);
    }
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'signup':
        return <BusinessSignup onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      case 'login':
        return <BusinessLogin onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
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
      case 'public':
        return <PublicFollowPage slug={publicSlug} onNavigate={handleNavigate} />;
      case 'contact':
        return <ContactSupport onNavigate={handleNavigate} prefill={contactPrefill} />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return <div>{renderScreen()}</div>;
}
