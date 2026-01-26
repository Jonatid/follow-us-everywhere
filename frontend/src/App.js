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
    setEditingIndex(index);
    setTempUrl(business.socials[index].url);
  };

  const handleSave = async (index) => {
    setSaving(true);
    try {
      const social = business.socials[index];
      await api.put(`/socials/${social.id}`, { url: tempUrl });
      alert('Link updated successfully!');
      setEditingIndex(null);
      onRefresh();
    } catch (err) {
      alert(`Failed to update link: ${err.response?.data?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <div className="dashboard-header">
            <h1 className="heading-lg">Dashboard</h1>
            <button type="button" onClick={onLogout} className="link-button link-button--inline">Logout</button>
          </div>
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
                      <button type="button" onClick={() => handleEdit(index)} className="link-button link-button--inline">
                        Edit
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
// MAIN APP
// =============================================================================

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [publicSlug, setPublicSlug] = useState(null);

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
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return <div>{renderScreen()}</div>;
}
