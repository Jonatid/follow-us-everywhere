// =============================================================================
// COMPLETE API-CONNECTED APP.JS
// Replace your entire frontend/src/App.js with this code
// =============================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://followuseverywhere-api.onrender.com/api';

// =============================================================================
// API SERVICE
// =============================================================================

const api = axios.create({
  baseURL: API_URL,
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
  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
    <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Follow Us Everywhere</h1>
        <p className="text-xl text-gray-600 mb-2">One link to connect customers to all your social pages.</p>
        <p className="text-gray-500">Get your custom link and QR code in minutes.</p>
      </div>
      <div className="space-y-4">
        <button onClick={() => onNavigate('signup')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg">
          Create Your Follow Hub
        </button>
        <button onClick={() => onNavigate('login')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-4 px-6 rounded-lg transition-colors">
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
    setFormData(prev => ({
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <button onClick={() => onNavigate('landing')} className="text-gray-600 hover:text-gray-700 mb-4 text-sm">← Back</button>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Follow Hub</h1>
          <p className="text-gray-600">Get started in under 2 minutes</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name *</label>
            <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., Joe's Coffee Shop" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Your Custom Link</label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-2">followuseverywhere.app/</span>
              <input type="text" value={formData.slug} onChange={(e) => handleChange('slug', e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="yourname" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tagline (Optional)</label>
            <input type="text" value={formData.tagline} onChange={(e) => handleChange('tagline', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., Best Coffee in Town" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
            <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="you@business.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
            <input type="password" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Create a password" />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Creating Account...' : 'Create Account & Continue'}
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <button onClick={() => onNavigate('login')} className="text-purple-600 hover:text-purple-700 font-semibold">Login</button>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <button onClick={() => onNavigate('landing')} className="text-gray-600 hover:text-gray-700 mb-4 text-sm">← Back</button>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Login</h1>
          <p className="text-gray-600">Access your dashboard</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="you@business.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Enter your password" />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account? <button onClick={() => onNavigate('signup')} className="text-purple-600 hover:text-purple-700 font-semibold">Sign up</button>
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
    navigator.clipboard.writeText(link).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy. Link: ' + link);
    });
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setTempUrl(business.socials[index].url);
  };

  const handleSave = async (index) => {
    setSaving(true);
    try {
      const updatedSocials = business.socials.map((s, i) => 
        i === index ? { platform: s.platform, url: tempUrl } : { platform: s.platform, url: s.url }
      );
      await api.put('/socials', { socials: updatedSocials });
      alert('Link updated successfully!');
      setEditingIndex(null);
      onRefresh();
    } catch (err) {
      alert('Failed to update link: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <button onClick={onLogout} className="text-gray-600 hover:text-gray-700 text-sm font-semibold">Logout</button>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{business.name}</h2>
            <p className="text-gray-600">{business.tagline}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">Your Follow Us Everywhere link:</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm min-w-0">
                https://follow-us-everywhere-web.onrender.com/{business.slug}
              </code>
              <button onClick={handleCopyLink} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-semibold whitespace-nowrap">
                Copy Link
              </button>
            </div>
          </div>
          <button onClick={() => onNavigate('public', business.slug)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg mb-6">
            Preview Public Follow Page
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Social Profiles</h2>
          <div className="space-y-3">
            {business.socials.map((social, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{social.icon}</span>
                    <span className="font-semibold">{social.platform}</span>
                  </div>
                  <div className="flex gap-2">
                    {editingIndex === index ? (
                      <>
                        <button onClick={() => handleSave(index)} disabled={saving} className="text-green-600 hover:text-green-700 text-sm font-semibold disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingIndex(null)} className="text-gray-600 hover:text-gray-700 text-sm font-semibold">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => handleEdit(index)} className="text-purple-600 hover:text-purple-700 text-sm font-semibold">Edit</button>
                    )}
                  </div>
                </div>
                {editingIndex === index ? (
                  <input type="text" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder={`https://${social.platform.toLowerCase()}.com/yourhandle`} />
                ) : (
                  <p className="text-sm text-gray-600 truncate">{social.url || `Add your ${social.platform} link`}</p>
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
    const activeSocials = business.socials.filter(s => s.url);
    activeSocials.forEach(social => window.open(social.url, '_blank'));
    alert(`Opened ${activeSocials.length} platforms! Click Follow on each to connect.`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-red-600">{error}</div></div>;

  const activeSocials = business.socials.filter(s => s.url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <button onClick={() => onNavigate('landing')} className="text-gray-600 hover:text-gray-700 mb-4 text-sm">← Back</button>
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {business.logo}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>
          <p className="text-gray-600 mb-4">{business.tagline}</p>
          <p className="text-sm text-gray-500">Follow this business everywhere in two taps.</p>
        </div>
        {activeSocials.length === 0 ? (
          <div className="text-center py-8 text-gray-500"><p>This business hasn't added their social links yet.</p></div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {business.socials.map((social, index) => social.url ? (
                <button key={index} onClick={() => handlePlatformClick(social.platform, social.url)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg flex items-center justify-between transition-colors">
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{social.icon}</span>
                    <span>{social.platform === 'YouTube' ? 'Subscribe on' : social.platform === 'Facebook' ? 'Like on' : social.platform === 'LinkedIn' ? 'Connect on' : social.platform === 'Website' ? 'Visit' : 'Follow on'} {social.platform}</span>
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              ) : null)}
            </div>
            {activeSocials.length > 1 && (
              <button onClick={handleFollowEverywhere} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow-lg transition-all">
                Follow Us Everywhere
              </button>
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
        return currentBusiness ? <BusinessDashboard business={currentBusiness} onNavigate={handleNavigate} onLogout={handleLogout} onRefresh={fetchCurrentBusiness} /> : <LandingPage onNavigate={handleNavigate} />;
      case 'public':
        return <PublicFollowPage slug={publicSlug} onNavigate={handleNavigate} />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return <div>{renderScreen()}</div>;
}