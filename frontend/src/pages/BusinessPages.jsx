import React, { useState, useEffect, useMemo, useRef } from 'react';
import BusinessAccountMenu from '../components/BusinessAccountMenu';
import QrCard from './business/components/QrCard';
import QrDisplayModeSelector from './business/components/QrDisplayModeSelector';
import { PlatformIcon } from '../components/PlatformIcon';
import { ServiceIcon, ServiceIconPicker } from '../components/ServiceIcon';
import { api, customerApi, getApiErrorMessage, buildPublicBusinessUrl, normalizePublicBusinessKey, normalizePublicBusinessPayload, resolvePublicBusinessKey, toAbsoluteAssetUrl, normalizeLogoUrlValue, LOGO_UPLOAD_ACCEPT, LOGO_UPLOAD_MAX_BYTES, ALLOWED_LOGO_MIME_TYPES, normalizeWidgetSettings, PASSWORD_HELPER, PASSWORD_REGEX } from '../services/appApi';
import { BackLink } from '../components/BackLink';
import businessVerifiedIcon from '../assets/business-verified.svg';
import impactVerifiedIcon from '../assets/impact-verified.svg';
import communityImpactIcon from '../assets/community-impact.svg';
import heroBg from '../assets/vector-network.png';

export const BusinessForgotPassword = ({ onNavigate, initialMessage = '' }) => {
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

export const BusinessResetPassword = ({ onNavigate, token, initialMessage = '' }) => {
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

export const BusinessDashboard = ({ business, onNavigate, onLogout, onRefresh }) => {
  const PHILANTHROPIC_MAX_LENGTH = 350;
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

  const [services, setServices] = useState([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', category: '', icon_key: '', image_url: '' });
  const [serviceFormError, setServiceFormError] = useState('');
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceDeleteError, setServiceDeleteError] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceImageUploading, setServiceImageUploading] = useState(false);

  const loadServices = async () => {
    try {
      const res = await api.get('/businesses/services');
      setServices(res.data.services || []);
    } catch (_) {}
    setServicesLoaded(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (serviceSaving) return;
    if (!serviceForm.name.trim()) { setServiceFormError('Service name is required.'); return; }
    setServiceFormError('');
    setServiceSaving(true);
    try {
      if (editingServiceId) {
        const res = await api.put(`/businesses/services/${editingServiceId}`, serviceForm);
        setServices(prev => prev.map(s => s.id === editingServiceId ? res.data.service : s));
        setEditingServiceId(null);
      } else {
        const res = await api.post('/businesses/services', serviceForm);
        setServices(prev => [...prev, res.data.service]);
      }
      setServiceForm({ name: '', description: '', category: '', icon_key: '', image_url: '' });
    } catch (err) {
      setServiceFormError(err?.response?.data?.message || 'Failed to save service.');
    } finally {
      setServiceSaving(false);
    }
  };

  const handleServiceDelete = async (id) => {
    if (!window.confirm('Remove this service?')) return;
    setServiceDeleteError('');
    try {
      await api.delete(`/businesses/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setServiceDeleteError(err?.response?.data?.message || 'Could not delete this service. Please try again.');
    }
  };

  const startEditService = (service) => {
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      category: service.category || '',
      icon_key: service.icon_key || '',
      image_url: service.image_url || '',
    });
  };

  const handleServiceImageUpload = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setServiceFormError('Image must be JPG, PNG, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setServiceFormError('Image must be under 10 MB.');
      return;
    }
    setServiceImageUploading(true);
    setServiceFormError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/businesses/services/image-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setServiceForm(p => ({ ...p, image_url: res.data.image_url || '' }));
    } catch (err) {
      setServiceFormError(err?.response?.data?.message || 'Image upload failed.');
    } finally {
      setServiceImageUploading(false);
    }
  };

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
    if (!servicesLoaded) loadServices();
  }, [business]); // eslint-disable-line react-hooks/exhaustive-deps

  const publicBusinessKey = resolvePublicBusinessKey(business);

  const handleCopyLink = () => {
    if (!publicBusinessKey) {
      alert('Public link is unavailable until your slug or username is set.');
      return;
    }

    const link = buildPublicBusinessUrl(publicBusinessKey);
    navigator.clipboard
      .writeText(link)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(() => {
        alert(`Failed to copy. Link: ${link}`);
      });
  };

  const handlePreviewPublicPage = () => {
    if (!publicBusinessKey) {
      alert('Public link is unavailable until your slug or username is set.');
      return;
    }

    const publicUrl = buildPublicBusinessUrl(publicBusinessKey);
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
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
      setActionError('Content must be 350 characters or fewer.');
      return;
    }
    setSupportSaving(true);
    setActionError('');
    try {
      const payload = {
        [philanthropicContentType]: selectedValue,
      };
      await api.put('/business/profile/update', payload);
      alert('Philanthropic content updated successfully!');
      onRefresh();
    } catch (err) {
      if (err?.response?.status === 400) {
        setActionError('Content must be 350 characters or fewer.');
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
            <BusinessAccountMenu businessName={business.name} onNavigate={onNavigate} onLogout={onLogout} currentView="dashboard" />
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
                {publicBusinessKey ? buildPublicBusinessUrl(publicBusinessKey) : 'Set a slug or username to enable your public link.'}
              </code>
              <button type="button" onClick={handleCopyLink} className="button button-primary button-sm">
                Copy Link
              </button>
            </div>
          </div>
          <button type="button" onClick={handlePreviewPublicPage} className="button button-secondary button-full">
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
          <div>
            <h2 className="heading-md" style={{ marginBottom: 4 }}>Products &amp; Services</h2>
            <p className="subtitle" style={{ marginBottom: 12 }}>List what your business offers. These appear on your public profile.</p>

            {serviceDeleteError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{serviceDeleteError}</p>}

            {/* Service list — all entries */}
            {!servicesLoaded && <p className="muted-text" style={{ fontSize: 13 }}>Loading...</p>}
            {servicesLoaded && services.length === 0 && (
              <p className="muted-text" style={{ fontSize: 13 }}>No services added yet.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
              {services.map((service, index) => (
                <div key={service.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f1f5f9', gap: 8 }}>
                    {/* Reorder arrows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 }}>
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0 || serviceSaving}
                        style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? '#e2e8f0' : '#94a3b8', fontSize: 12, lineHeight: 1, padding: '2px 4px' }}
                        onClick={async () => {
                          if (index === 0) return;
                          const updated = [...services];
                          [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                          setServices(updated);
                          try {
                            await Promise.all([
                              api.put(`/businesses/services/${updated[index - 1].id}`, { display_order: index - 1 }),
                              api.put(`/businesses/services/${updated[index].id}`, { display_order: index }),
                            ]);
                          } catch (_) { loadServices(); }
                        }}
                      >▲</button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === services.length - 1 || serviceSaving}
                        style={{ background: 'none', border: 'none', cursor: index === services.length - 1 ? 'default' : 'pointer', color: index === services.length - 1 ? '#e2e8f0' : '#94a3b8', fontSize: 12, lineHeight: 1, padding: '2px 4px' }}
                        onClick={async () => {
                          if (index === services.length - 1) return;
                          const updated = [...services];
                          [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                          setServices(updated);
                          try {
                            await Promise.all([
                              api.put(`/businesses/services/${updated[index].id}`, { display_order: index }),
                              api.put(`/businesses/services/${updated[index + 1].id}`, { display_order: index + 1 }),
                            ]);
                          } catch (_) { loadServices(); }
                        }}
                      >▼</button>
                    </div>

                    {/* Service info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 1 }}>{service.name}</p>
                      {service.description && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 2, lineHeight: 1.4 }}>{service.description}</p>}
                      {service.category && <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{service.category}</p>}
                    </div>

                    {/* Edit / Delete */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        type="button"
                        style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--secondary, #1a73e8)', cursor: 'pointer', padding: '2px 6px' }}
                        onClick={() => startEditService(service)}
                      >Edit</button>
                      <button
                        type="button"
                        style={{ fontSize: 12, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px' }}
                        onClick={() => handleServiceDelete(service.id)}
                      >✕</button>
                    </div>
                  </div>

                  {/* Inline edit form — appears below the selected service */}
                  {editingServiceId === service.id && (
                    <form onSubmit={handleServiceSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px', margin: '8px 0' }}>
                      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Edit service</p>
                      {serviceFormError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 6 }}>{serviceFormError}</p>}
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Name *</label>
                        <input className="input" style={{ fontSize: 13, padding: '6px 10px' }} type="text" maxLength={100} value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Description (optional)</label>
                        <textarea className="input" style={{ fontSize: 13, padding: '6px 10px' }} rows={3} maxLength={500} value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} />
                        <p style={{ fontSize: 11, color: serviceForm.description.length > 480 ? '#ef4444' : '#94a3b8', textAlign: 'right', margin: '2px 0 0' }}>{serviceForm.description.length} / 500</p>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Category (optional)</label>
                        <input className="input" style={{ fontSize: 13, padding: '6px 10px' }} type="text" maxLength={50} placeholder="e.g. Transportation" value={serviceForm.category} onChange={e => setServiceForm(p => ({ ...p, category: e.target.value }))} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Icon</label>
                        <ServiceIconPicker value={serviceForm.icon_key} onChange={key => setServiceForm(p => ({ ...p, icon_key: key }))} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Image (optional)</label>
                        {serviceForm.image_url && (
                          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src={serviceForm.image_url} alt="Service preview" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                            <button type="button" style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setServiceForm(p => ({ ...p, image_url: '' }))}>Remove</button>
                          </div>
                        )}
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" disabled={serviceImageUploading} onChange={e => handleServiceImageUpload(e.target.files[0])} style={{ fontSize: 12 }} />
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Max 10 MB · JPG, PNG, or WebP</p>
                        {serviceImageUploading && <p style={{ fontSize: 11, color: '#60719a', marginTop: 3 }}>Uploading…</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="submit" className="button button-primary button-sm" style={{ fontSize: 13 }} disabled={serviceSaving || serviceImageUploading}>{serviceSaving ? 'Saving...' : 'Save'}</button>
                        <button type="button" className="button button-secondary button-sm" style={{ fontSize: 13 }} onClick={() => { setEditingServiceId(null); setServiceForm({ name: '', description: '', category: '', icon_key: '', image_url: '' }); }}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>

            {/* Add new service form — only shown when not editing an existing one */}
            {!editingServiceId && services.length < 20 && canEditBusiness && (
              <form onSubmit={handleServiceSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px' }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Add a service</p>
                {serviceFormError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 6 }}>{serviceFormError}</p>}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Name *</label>
                  <input className="input" style={{ fontSize: 13, padding: '6px 10px' }} type="text" maxLength={100} placeholder="e.g. Pre-Scheduled Rides" value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Description (optional)</label>
                  <textarea className="input" style={{ fontSize: 13, padding: '6px 10px' }} rows={2} maxLength={500} placeholder="Brief description of what you offer" value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} />
                  <p style={{ fontSize: 11, color: serviceForm.description.length > 480 ? '#ef4444' : '#94a3b8', textAlign: 'right', margin: '2px 0 0' }}>{serviceForm.description.length} / 500</p>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Category (optional)</label>
                  <input className="input" style={{ fontSize: 13, padding: '6px 10px' }} type="text" maxLength={50} placeholder="e.g. Transportation" value={serviceForm.category} onChange={e => setServiceForm(p => ({ ...p, category: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Icon</label>
                  <ServiceIconPicker value={serviceForm.icon_key} onChange={key => setServiceForm(p => ({ ...p, icon_key: key }))} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>Image (optional)</label>
                  {serviceForm.image_url && (
                    <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={serviceForm.image_url} alt="Service preview" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                      <button type="button" style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setServiceForm(p => ({ ...p, image_url: '' }))}>Remove</button>
                    </div>
                  )}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" disabled={serviceImageUploading} onChange={e => handleServiceImageUpload(e.target.files[0])} style={{ fontSize: 12 }} />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Max 10 MB · JPG, PNG, or WebP</p>
                  {serviceImageUploading && <p style={{ fontSize: 11, color: '#60719a', marginTop: 3 }}>Uploading…</p>}
                </div>
                <button type="submit" className="button button-primary button-sm" style={{ fontSize: 13 }} disabled={serviceSaving || serviceImageUploading}>{serviceSaving ? 'Saving...' : 'Add service'}</button>
              </form>
            )}
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

const PLATFORM_TILE = {
  Instagram:  { bg: 'linear-gradient(135deg,#f59e0b,#ef4444,#ec4899)', color: '#fff' },
  Facebook:   { bg: '#1877f2', color: '#fff' },
  LinkedIn:   { bg: '#0a66c2', color: '#fff' },
  Twitter:    { bg: '#000', color: '#fff' },
  X:          { bg: '#000', color: '#fff' },
  YouTube:    { bg: '#ff0000', color: '#fff' },
  TikTok:     { bg: '#010101', color: '#fff' },
  Pinterest:  { bg: '#e60023', color: '#fff' },
  Snapchat:   { bg: '#fffc00', color: '#000' },
  Website:    { bg: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' },
};
const getPlatformTile = (platform) => PLATFORM_TILE[platform] || { bg: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' };
const getSocialVerb = (platform) => {
  if (platform === 'YouTube') return 'Subscribe on';
  if (platform === 'Facebook') return 'Like on';
  if (platform === 'LinkedIn') return 'Connect on';
  if (platform === 'Website') return 'Visit';
  return 'Follow on';
};

export const PublicFollowPage = ({ slug, onNavigate }) => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);
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
      const lookupKey = normalizePublicBusinessKey(slug);
      if (!lookupKey) {
        setError('Business not found');
        setLoading(false);
        return;
      }

      try {
        let response;
        try {
          response = await customerApi.get(`/public/businesses/by-slug/${encodeURIComponent(lookupKey)}`);
        } catch (primaryError) {
          const primaryStatus = primaryError?.response?.status;
          if (primaryStatus === 404) {
            response = await customerApi.get(`/public/businesses/slug/${encodeURIComponent(lookupKey)}`);
          } else {
            throw primaryError;
          }
        }

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

  if (!business || typeof business !== 'object') {
    return (
      <div className="page">
        <div className="alert alert-error">Business not found</div>
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

  const widgetSettings = normalizeWidgetSettings(business.widget_settings);
  const publicQrMode = widgetSettings.layoutMode;
  const shouldShowLinks = publicQrMode === 'minimal' ? false : widgetSettings.showLinks;
  const activeSocials = business.socials.filter((s) => s.url);
  const visibleSocials = shouldShowLinks ? activeSocials : [];
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
  const hasApprovedImpactBadges = badges.length > 0;
  const verificationStatusValue = String(business.verification_status || '').toLowerCase();
  const isBusinessVerified = ['active', 'verified'].includes(verificationStatusValue) || business.verified === true || business.verification === 'verified';
  const missionStatement = business.mission_statement || '';
  const visionStatement = business.vision_statement || '';
  const philanthropicGoals = business.philanthropic_goals || '';
  const communitySupportText = business.community_support_text || '';
  const statementCards = [
    {
      title: 'What We Do',
      key: 'what_we_do',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: 20, height: 20, display: 'block', flexShrink: 0 }}>
          <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ),
      value: missionStatement,
    },
    {
      title: 'Mission & Vision',
      key: 'mission_vision',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: 20, height: 20, display: 'block', flexShrink: 0 }}>
          <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      ),
      value: visionStatement,
    },
    {
      title: 'Philanthropic Goals',
      key: 'philanthropic_goals',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: 20, height: 20, display: 'block', flexShrink: 0 }}>
          <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
      value: philanthropicGoals,
    },
    {
      title: 'Community Impact',
      key: 'community_impact',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: 20, height: 20, display: 'block', flexShrink: 0 }}>
          <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93A8.001 8.001 0 0 1 4.07 13H6c.33 2.526 1.887 4.67 4 5.93zm0-3.03A6.002 6.002 0 0 1 6.07 13H11v3.9zM11 11H6.07A6.002 6.002 0 0 1 11 7.1V11zm0-5.93C8.887 6.33 7.33 8.474 7 11H4.07A8.001 8.001 0 0 1 11 5.07v-.001zM13 5.07A8.001 8.001 0 0 1 19.93 11H17c-.33-2.526-1.887-4.67-4-5.93zm0 3.03A6.002 6.002 0 0 1 17.93 11H13V8.1zM13 13h4.93A6.002 6.002 0 0 1 13 16.9V13zm0 5.93V19A8.001 8.001 0 0 1 19.93 13H17c-.33 2.526-1.887 4.67-4 5.93z"/>
        </svg>
      ),
      value: communitySupportText,
    },
  ].filter((card) => card.value && card.value.trim().length > 0);
  const publicQrSlug = normalizePublicBusinessKey(slug) || resolvePublicBusinessKey(business);
  const publicQrCardSize = publicQrMode === 'minimal' ? 120 : publicQrMode === 'full' ? 180 : 150;
  const publicQrCompact = publicQrMode === 'minimal';
  const showQrSection = business.show_qr !== false;
  const publicProfileUrl = `https://fuse101.com/b/${encodeURIComponent(publicQrSlug || 'your-business')}`;

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
              {business.business_type && (
                <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan, #29b6f6)', margin: '4px 0 0' }}>
                  {business.business_type}
                </p>
              )}
              {business.tagline && (
                <p className="subtitle public-business-hero__subtitle" style={{ marginTop: '6px' }}>{business.tagline}</p>
              )}
              <div className="row row-wrap" style={{ justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                {isBusinessVerified ? (
                  <span className="badge badge--verified">
                    <img src={businessVerifiedIcon} alt="" className="badge__icon" aria-hidden="true" />
                    Verified
                  </span>
                ) : null}
                {hasApprovedImpactBadges ? (
                  <span className="badge badge--verified">
                    <img src={impactVerifiedIcon} alt="" className="badge__icon" aria-hidden="true" />
                    Impact Verified
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="public-business-shell">
        <div className="public-business-layout">
          <section className="card public-business-column" aria-label="Follow links" style={{ padding: '20px' }}>
            <p className="public-follow-helper" style={{ marginBottom: '14px' }}>{widgetSettings.ctaText}</p>
            {visibleSocials.length === 0 ? (
              <div className="empty-state">This business hasn't added their social links yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Featured tile — first link gets full-width bold treatment */}
                {(() => {
                  const s = visibleSocials[0];
                  const tile = getPlatformTile(s.platform);
                  return (
                    <button
                      key={s.id || 0}
                      type="button"
                      onClick={() => handlePlatformClick(s.platform, s.url)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        width: '100%', border: tile.border || 'none', cursor: 'pointer',
                        background: tile.bg, color: tile.color,
                        borderRadius: '14px', padding: '16px 18px',
                        boxShadow: '0 4px 16px rgba(0,0,0,.13)',
                        transition: 'transform .15s, box-shadow .15s',
                        textAlign: 'left',
                      }}
                    >
                      <PlatformIcon platform={s.platform} size="26px" />
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '15px', fontWeight: 700 }}>{getSocialVerb(s.platform)} {s.platform}</span>
                        <span style={{ fontSize: '12px', opacity: .72 }}>Tap to open</span>
                      </span>
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: '18px', height: '18px', display: 'block', flexShrink: 0, opacity: .65 }}>
                        <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                      </svg>
                    </button>
                  );
                })()}
                {/* Remaining links — 2-column bento grid */}
                {visibleSocials.length > 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {visibleSocials.slice(1).map((s, i) => {
                      const tile = getPlatformTile(s.platform);
                      return (
                        <button
                          key={s.id || i + 1}
                          type="button"
                          onClick={() => handlePlatformClick(s.platform, s.url)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                            border: tile.border || 'none', cursor: 'pointer',
                            background: tile.bg, color: tile.color,
                            borderRadius: '14px', padding: '16px',
                            minHeight: '88px',
                            boxShadow: '0 2px 8px rgba(0,0,0,.07)',
                            transition: 'transform .15s',
                            textAlign: 'left',
                          }}
                        >
                          <PlatformIcon platform={s.platform} size="22px" />
                          <span style={{ fontSize: '13px', fontWeight: 700, marginTop: '6px' }}>{s.platform}</span>
                          <span style={{ fontSize: '11px', opacity: .7, marginTop: '2px' }}>{getSocialVerb(s.platform)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {showQrSection && (
              <div className="public-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <QrCard
                  businessName={businessName || business.name}
                  slug={publicQrSlug || 'your-business'}
                  size={publicQrCardSize}
                  compact={publicQrCompact}
                  showBranding={widgetSettings.showBranding}
                  showBusinessName={widgetSettings.showBusinessName}
                />
                <ShareableLinkBar url={publicProfileUrl} />
                <SaveContactButton slug={publicQrSlug} />
              </div>
            )}
          </section>

          {/* Right column — Featured + Statement grid */}
          <section className="card public-business-column" aria-label="Products and Services" style={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px' }}>
            {Array.isArray(business.services) && business.services.length > 0 && (() => {
              const featured = business.services[0];
              const featuredLabel = business.featured_label || 'Featured Product & Service';
              const featuredImageUrl = featured.image_url ? toAbsoluteAssetUrl(featured.image_url) : null;
              return (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#94a3b8', marginBottom: '12px' }}>{featuredLabel}</p>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                          <ServiceIcon iconKey={featured.icon_key} size="22px" />
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: '15px', margin: 0, lineHeight: 1.3 }}>{featured.name}</h3>
                      </div>
                      {featured.description && <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, margin: '0 0 8px' }}>{featured.description}</p>}
                      {featured.category && (
                        <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#0047cc', background: '#eef4ff', borderRadius: '999px', padding: '3px 8px' }}>{featured.category}</span>
                      )}
                    </div>
                    {featuredImageUrl && (
                      <img
                        src={featuredImageUrl}
                        alt={featured.name}
                        style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0, border: '1px solid #f1f5f9' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  {business.services.length > 1 && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {business.services.slice(1).map((service, idx) => (
                        <div key={service.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: idx < business.services.length - 2 ? '1px solid #f8fafc' : 'none' }}>
                          <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '8px', background: ['#fef3c7','#f0fdf4','#fae8ff','#fff7ed','#f0f9ff'][(idx) % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', color: ['#92400e','#166534','#7e22ce','#9a3412','#0c4a6e'][(idx) % 5] }}>
                            <ServiceIcon iconKey={service.icon_key} size="16px" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: '13px', margin: '0 0 2px' }}>{service.name}</p>
                            {service.category && <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, margin: 0 }}>{service.category}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {statementCards.length > 0 && (() => {
              const count = statementCards.length;
              const cols = count === 1 ? '1fr' : 'repeat(2, 1fr)';
              const CARD_ILLUSTRATIONS = {
                what_we_do: (
                  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={{ width: 72, height: 72, display: 'block' }}>
                    <path fill="currentColor" d="M42.7 29.3c4.4 0 8-3.6 8-8s-3.6-8-8-8c-4.4 0-8 3.6-8 8s3.6 8 8 8zm-21.4 0c4.4 0 8-3.6 8-8s-3.6-8-8-8c-4.4 0-8 3.6-8 8s3.6 8 8 8zm0 5.4C14.5 34.7 2.7 37.8 2.7 44.5V50h37.3v-5.5c0-6.7-11.8-9.8-18.7-9.8zm21.4 0c-.8 0-1.7.1-2.6.2 3.1 2.2 5.3 5.3 5.3 9.1V50H61.3v-5.5c0-6.7-11.8-9.8-18.6-9.8z"/>
                  </svg>
                ),
                mission_vision: (
                  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={{ width: 72, height: 72, display: 'block' }}>
                    <path fill="currentColor" d="M32 10.7C18.5 10.7 7.3 20.3 4 32c3.3 11.7 14.5 21.3 28 21.3S56.7 43.7 60 32C56.7 20.3 45.5 10.7 32 10.7zm0 35.6c-7.5 0-13.3-6-13.3-14.3S24.5 17.7 32 17.7s13.3 6 13.3 14.3S39.5 46.3 32 46.3zm0-22.9c-4.7 0-8 3.8-8 8.6s3.3 8.6 8 8.6 8-3.8 8-8.6-3.3-8.6-8-8.6z"/>
                  </svg>
                ),
                philanthropic_goals: (
                  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={{ width: 72, height: 72, display: 'block' }}>
                    <path fill="currentColor" d="M32 56.9l-3.9-3.5C13.1 41 4 33.6 4 24.3c0-8.4 6.6-15 15-15 4.7 0 9.2 2.2 12 5.7 2.8-3.5 7.3-5.7 12-5.7 8.4 0 15 6.6 15 15 0 9.3-9.1 16.7-24.1 29.1L32 56.9z"/>
                  </svg>
                ),
                community_impact: (
                  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={{ width: 72, height: 72, display: 'block' }}>
                    <path fill="currentColor" d="M32 5.3C17.3 5.3 5.3 17.3 5.3 32S17.3 58.7 32 58.7 58.7 46.7 58.7 32 46.7 5.3 32 5.3zm-2.7 47.9c-9.2-1.2-16.7-7.6-19.5-16.5h5.5c2.1 6.2 7 11 13.3 13v-3.1c-4.7-1.7-8.4-5.9-9.6-11h9.3v17.6zm0-22.9H12c.3-1.4.7-2.8 1.3-4h16v4zm0-9.3H15.5c2.7-5.3 7.4-9.2 13.1-10.7v10.7zm5.4 0V10.3c5.7 1.5 10.4 5.4 13.1 10.7H34.7zm0 4h16c.6 1.2 1 2.6 1.3 4H34.7v-4zm2.7 27.2V35.4h9.3c-1.2 5.1-4.9 9.3-9.6 11v3.1c6.3-2 11.2-6.8 13.3-13h5.5c-2.8 8.9-10.3 15.3-19.5 16.5z"/>
                  </svg>
                ),
              };
              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: cols,
                  gap: '12px',
                  marginTop: Array.isArray(business.services) && business.services.length > 0 ? '4px' : '0',
                  alignItems: 'stretch',
                }}>
                  {statementCards.map((card, idx) => (
                    <div
                      key={card.key}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        border: '1px solid #e9eef5',
                        borderRadius: '14px',
                        padding: '18px',
                        gridColumn: count === 3 && idx === 2 ? '1 / -1' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: count <= 2 ? '160px' : '130px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#0047cc' }}>
                        {card.icon}
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#334155' }}>{card.title}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65, margin: 0, flex: 1, position: 'relative', zIndex: 1 }}>{card.value}</p>
                      <div style={{
                        position: 'absolute',
                        bottom: '-8px',
                        right: '-4px',
                        color: '#0047cc',
                        opacity: 0.07,
                        pointerEvents: 'none',
                        lineHeight: 1,
                      }}>
                        {CARD_ILLUSTRATIONS[card.key] || null}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {(!Array.isArray(business.services) || business.services.length === 0) && statementCards.length === 0 && (
              <div className="statement-card statement-card--placeholder">No information provided yet.</div>
            )}
          </section>
        </div>
      </div>
      {impactOpen && hasApprovedImpactBadges ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '760px', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="row space-between" style={{ alignItems: 'center' }}>
              <h2 className="heading-md" style={{ margin: 0 }}>Community Impact</h2>
              <button type="button" className="button button-muted button-sm" onClick={() => setImpactOpen(false)}>Close</button>
            </div>
            <p className="subtitle" style={{ marginTop: '6px' }}>{business.name}</p>
            <div className="badge-grid" style={{ marginTop: '12px' }}>
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
        </div>
      ) : null}
    </div>
  );
};


export const BusinessProfilePage = ({ business, onNavigate, onLogout, onBusinessUpdated }) => {
  const [formData, setFormData] = useState({
    name: business?.name || '',
    tagline: business?.tagline || '',
    businessType: business?.business_type || '',
    businessTypeCustom: '',
    logo: business?.logo_url || '',
    laraNumber: business?.lara_number || '',
    featuredLabel: business?.featured_label || 'Featured Product & Service',
  });
  const [logoPreview, setLogoPreview] = useState(toAbsoluteAssetUrl(business?.logo_url));
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [logoSaving, setLogoSaving] = useState(false);
  const [badgeCatalog, setBadgeCatalog] = useState([]);
  const [businessDocuments, setBusinessDocuments] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [requestForm, setRequestForm] = useState({ badge_id: '', business_notes: '', linked_document_id: '', evidence_url: '', evidence_explanation: '' });
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState('');
  const [documentType, setDocumentType] = useState('incorporation');
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState(() => normalizeWidgetSettings(business?.widget_settings));
  const documentFileInputRef = useRef(null);
  const logoAutosaveTimeoutRef = useRef(null);

  useEffect(() => {
    setFormData({
      name: business?.name || '',
      tagline: business?.tagline || '',
      businessType: business?.business_type || '',
      businessTypeCustom: '',
      logo: business?.logo_url || '',
      laraNumber: business?.lara_number || '',
      featuredLabel: business?.featured_label || 'Featured Product & Service',
    });
    setWidgetSettings(normalizeWidgetSettings(business?.widget_settings));
    setLogoPreview(toAbsoluteAssetUrl(business?.logo_url));
    setLogoPreviewError(false);

    if (logoAutosaveTimeoutRef.current) {
      clearTimeout(logoAutosaveTimeoutRef.current);
      logoAutosaveTimeoutRef.current = null;
    }
  }, [business]);

  useEffect(() => () => {
    if (logoAutosaveTimeoutRef.current) {
      clearTimeout(logoAutosaveTimeoutRef.current);
      logoAutosaveTimeoutRef.current = null;
    }
  }, []);


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
    [...new Set(badgeCatalog.map((badge) => badge.category).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  ), [badgeCatalog]);

  const filteredBadges = useMemo(() => (
    selectedBadgeCategory
      ? badgeCatalog.filter((badge) => badge.category === selectedBadgeCategory)
      : []
  ), [badgeCatalog, selectedBadgeCategory]);

  const selectedBadgeDetails = useMemo(() => (
    filteredBadges.find((badge) => String(badge.id) === String(requestForm.badge_id)) || null
  ), [filteredBadges, requestForm.badge_id]);

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
      form.append('document_number', formData.laraNumber.trim());
      form.append('document', documentFile);
      const response = await api.post('/business/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSaveMessage('Document uploaded successfully.');
      setDocumentFile(null);
      if (['lara', 'incorporation'].includes(documentType) && response?.data?.documentNumber) {
        const nextNumber = response.data.documentNumber;
        setFormData((prev) => ({ ...prev, laraNumber: nextNumber }));
        onBusinessUpdated((prev) => ({
          ...prev,
          lara_number: nextNumber,
        }));
      }
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
      if (err?.response?.status === 404) {
        const documentRecord = businessDocuments.find((doc) => doc.id === documentId);
        const storagePath = documentRecord?.storagePath ? String(documentRecord.storagePath).replace(/^\/+/, '') : '';

        if (storagePath) {
          const staticCandidates = [`/${storagePath}`, `/api/${storagePath}`];

          for (const url of staticCandidates) {
            try {
              const fallbackResponse = await api.get(url, { responseType: 'blob' });
              const fallbackBlobUrl = window.URL.createObjectURL(new Blob([fallbackResponse.data]));
              const fallbackLink = document.createElement('a');
              fallbackLink.href = fallbackBlobUrl;
              fallbackLink.setAttribute('download', fileName || documentRecord?.originalFileName || `document-${documentId}`);
              document.body.appendChild(fallbackLink);
              fallbackLink.click();
              fallbackLink.remove();
              window.URL.revokeObjectURL(fallbackBlobUrl);
              return;
            } catch {
              // Try the next static candidate URL.
            }
          }
        }

        setSaveError('Document record or file was not found. Please re-upload this document and try downloading again.');
        return;
      }

      setSaveError(getApiErrorMessage(err, 'Unable to download document.'));
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await api.delete(`/business/documents/${documentId}`);
      setSaveMessage('Document deleted successfully.');
      setBusinessDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setRequestForm((prev) => {
        if (!prev.linked_document_id) {
          return prev;
        }
        return String(prev.linked_document_id) === String(documentId)
          ? { ...prev, linked_document_id: '' }
          : prev;
      });
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to delete document.'));
    }
  };


  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'logo') {
      setLogoPreview(toAbsoluteAssetUrl(value));
      setLogoPreviewError(false);

      if (logoAutosaveTimeoutRef.current) {
        clearTimeout(logoAutosaveTimeoutRef.current);
      }

      const pendingLogoUrl = normalizeLogoUrlValue(value);
      const currentLogoUrl = normalizeLogoUrlValue(business?.logo_url || '');
      if (pendingLogoUrl === currentLogoUrl) {
        return;
      }

      logoAutosaveTimeoutRef.current = setTimeout(async () => {
        setLogoSaving(true);
        setSaveError('');

        try {
          const response = await api.put('/business/profile/update', {
            logo_url: pendingLogoUrl,
          });

          const persistedLogoUrl = response.data?.business?.logo_url ?? pendingLogoUrl ?? '';
          setFormData((prev) => ({ ...prev, logo: persistedLogoUrl }));
          setLogoPreview(toAbsoluteAssetUrl(persistedLogoUrl));
          setLogoPreviewError(false);
          onBusinessUpdated((prev) => ({
            ...prev,
            logo_url: persistedLogoUrl,
          }));
          setSaveMessage('Logo saved.');
        } catch (err) {
          setSaveError(getApiErrorMessage(err, 'Unable to auto-save logo right now.'));
        } finally {
          setLogoSaving(false);
          logoAutosaveTimeoutRef.current = null;
        }
      }, 700);
    }
  };

  const handleLogoFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
      setSaveError('Unsupported logo file type. Please upload a JPG, PNG, or WebP image.');
      setSaveMessage('');
      event.target.value = '';
      return;
    }

    if (file.size > LOGO_UPLOAD_MAX_BYTES) {
      setSaveError('Image must be 10 MB or smaller.');
      setSaveMessage('');
      event.target.value = '';
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

    if (!requestForm.business_notes || !requestForm.business_notes.trim()) {
      setSaveError('Please explain your action and why it matters to the community.');
      return;
    }

    if (!requestForm.linked_document_id) {
      setSaveError('Please select a supporting document.');
      return;
    }

    const trimmedEvidenceUrl = (requestForm.evidence_url || '').trim();
    const trimmedEvidenceExplanation = (requestForm.evidence_explanation || '').trim();

    if (trimmedEvidenceUrl && !trimmedEvidenceExplanation) {
      setSaveError('Please explain how the evidence URL proves this badge request.');
      return;
    }

    if (trimmedEvidenceExplanation.length > 500) {
      setSaveError('Evidence URL explanation must be 500 characters or less.');
      return;
    }

    setRequestLoading(true);
    setSaveError('');
    setSaveMessage('');

    try {
      await api.post('/business/badges/request', {
        badge_id: Number(requestForm.badge_id),
        business_notes: requestForm.business_notes.trim(),
        linked_document_id: Number(requestForm.linked_document_id),
        evidence_url: trimmedEvidenceUrl || null,
        evidence_explanation: trimmedEvidenceUrl ? trimmedEvidenceExplanation : null,
      });
      setSaveMessage('Badge request submitted. Submitted by business, pending admin verification.');
      setRequestForm({ badge_id: '', business_notes: '', linked_document_id: '', evidence_url: '', evidence_explanation: '' });
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
      const normalizedLogoUrl = normalizeLogoUrlValue(formData.logo);
      const resolvedBusinessType = formData.businessType === 'Other'
        ? (formData.businessTypeCustom.trim() || null)
        : (formData.businessType || null);
      const response = await api.put('/business/profile/update', {
        name: formData.name,
        tagline: formData.tagline,
        business_type: resolvedBusinessType,
        logo_url: normalizedLogoUrl,
        lara_number: formData.laraNumber || null,
        widget_settings: widgetSettings,
        featured_label: formData.featuredLabel || 'Featured Product & Service',
      });
      const persistedLogoUrl = response.data?.business?.logo_url ?? normalizedLogoUrl ?? '';
      const persistedWidgetSettings = normalizeWidgetSettings(response.data?.business?.widget_settings ?? widgetSettings);
      setFormData((prev) => ({ ...prev, logo: persistedLogoUrl }));
      setWidgetSettings(persistedWidgetSettings);
      setLogoPreview(toAbsoluteAssetUrl(persistedLogoUrl));
      setLogoPreviewError(false);
      onBusinessUpdated((prev) => ({
        ...prev,
        name: response.data?.business?.name ?? formData.name,
        tagline: response.data?.business?.tagline ?? formData.tagline,
        business_type: response.data?.business?.business_type ?? resolvedBusinessType,
        featured_label: response.data?.business?.featured_label ?? formData.featuredLabel,
        logo_url: persistedLogoUrl,
        lara_number: response.data?.business?.lara_number ?? (formData.laraNumber || null),
        widget_settings: persistedWidgetSettings,
      }));
      setSaveMessage('Profile saved successfully.');
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to save profile right now.'));
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
  const profilePublicBusinessKey = resolvePublicBusinessKey(business);

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <div className="dashboard-header">
            <h1 className="heading-lg">Business Profile</h1>
            <BusinessAccountMenu
              businessName={business?.name || 'Business'}
              onNavigate={onNavigate}
              onLogout={onLogout}
              currentView="business-profile"
              includeProfile
            />
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
                <label className="label">Business Type</label>
                <select
                  className="input"
                  value={formData.businessType}
                  onChange={(e) => handleChange('businessType', e.target.value)}
                >
                  <option value="">Select a type…</option>
                  <option>Automotive</option>
                  <option>Beauty &amp; Personal Care</option>
                  <option>Cleaning &amp; Home Services</option>
                  <option>Construction &amp; Contracting</option>
                  <option>Consulting &amp; Professional Services</option>
                  <option>Education &amp; Tutoring</option>
                  <option>Entertainment &amp; Events</option>
                  <option>Financial Services</option>
                  <option>Food &amp; Beverage</option>
                  <option>Health &amp; Wellness</option>
                  <option>Legal Services</option>
                  <option>Marketing &amp; Media</option>
                  <option>Nonprofit &amp; Community</option>
                  <option>Oral Health Care</option>
                  <option>Real Estate</option>
                  <option>Restaurant &amp; Catering</option>
                  <option>Retail &amp; E-commerce</option>
                  <option>Technology</option>
                  <option>Transportation</option>
                  <option>Other</option>
                </select>
                {formData.businessType === 'Other' && (
                  <input
                    className="input"
                    type="text"
                    style={{ marginTop: '8px' }}
                    placeholder="Describe your business type"
                    maxLength={100}
                    value={formData.businessTypeCustom}
                    onChange={(e) => handleChange('businessTypeCustom', e.target.value)}
                  />
                )}
              </div>
              <div className="field">
                <label className="label">Featured Section Label</label>
                <select
                  className="input"
                  value={formData.featuredLabel}
                  onChange={(e) => handleChange('featuredLabel', e.target.value)}
                >
                  <option value="Featured Product &amp; Service">Featured Product &amp; Service</option>
                  <option value="Featured Product">Featured Product</option>
                  <option value="Featured Service">Featured Service</option>
                </select>
                <p className="helper-text">This label appears above your top listing on your public profile.</p>
              </div>
              <div className="field">
                <label className="label">Logo URL</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="input"
                    type="text"
                    value={formData.logo}
                    onChange={(e) => handleChange('logo', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <button
                    type="button"
                    className="button button-ghost"
                    aria-label="Clear logo URL"
                    onClick={() => handleChange('logo', '')}
                    disabled={!formData.logo}
                    style={{ minWidth: 'auto', padding: '0.45rem 0.7rem', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="label">Upload logo image</label>
                <input className="input" type="file" accept={LOGO_UPLOAD_ACCEPT} onChange={handleLogoFileChange} />
                <p className="helper-text">Accepted: JPG, PNG, WebP. Max upload size: 10 MB.</p>
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
              <button type="button" className="button button-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </button>
              {logoSaving ? <p className="helper-text">Saving logo...</p> : null}
            </div>

            <div className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
              <h2 className="heading-md">QR / Widget Customization</h2>
              <p className="subtitle">
                Choose how your public page and QR card should render.
              </p>
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 320px', minWidth: '280px' }}>
                  <QrDisplayModeSelector
                    value={widgetSettings.layoutMode}
                    onChange={(nextMode) => setWidgetSettings((prev) => normalizeWidgetSettings({ ...prev, layoutMode: nextMode }))}
                  />
                  <div className="field" style={{ marginTop: '12px' }}>
                    <label className="label">Button / helper CTA text</label>
                    <input
                      className="input"
                      type="text"
                      maxLength={80}
                      value={widgetSettings.ctaText}
                      onChange={(e) => setWidgetSettings((prev) => normalizeWidgetSettings({ ...prev, ctaText: e.target.value }))}
                    />
                  </div>
                  <div className="row row-wrap" style={{ gap: '12px', marginTop: '12px' }}>
                    <label className="row" style={{ gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={widgetSettings.showBranding}
                        onChange={(e) => setWidgetSettings((prev) => normalizeWidgetSettings({ ...prev, showBranding: e.target.checked }))}
                      />
                      Show branding
                    </label>
                    <label className="row" style={{ gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={widgetSettings.showBusinessName}
                        onChange={(e) => setWidgetSettings((prev) => normalizeWidgetSettings({ ...prev, showBusinessName: e.target.checked }))}
                      />
                      Show business name
                    </label>
                    <label className="row" style={{ gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={widgetSettings.showLinks}
                        onChange={(e) => setWidgetSettings((prev) => normalizeWidgetSettings({ ...prev, showLinks: e.target.checked }))}
                        disabled={widgetSettings.layoutMode === 'minimal'}
                      />
                      Show social links
                    </label>
                  </div>
                </div>
                <div style={{ flex: '0 0 auto', marginInline: 'auto' }}>
                  <QrCard
                    businessName={profileBusinessName || business?.name || 'Your Business'}
                    slug={profilePublicBusinessKey || 'your-business'}
                    size={widgetSettings.layoutMode === 'minimal' ? 120 : widgetSettings.layoutMode === 'full' ? 180 : 150}
                    compact={widgetSettings.layoutMode === 'minimal'}
                    showBranding={widgetSettings.showBranding}
                    showBusinessName={widgetSettings.showBusinessName}
                  />
                </div>
              </div>
              <p className="helper-text" style={{ marginTop: '12px' }}>
                QR destination: {profilePublicBusinessKey ? buildPublicBusinessUrl(profilePublicBusinessKey) : 'Set your slug or username to activate your public QR link.'}
              </p>
              <div className="row row-wrap" style={{ gap: '10px', marginTop: '8px' }}>
                <button type="button" className="button button-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    const previewPath = profilePublicBusinessKey
                      ? `/b/${encodeURIComponent(profilePublicBusinessKey)}`
                      : '/business';
                    onNavigate('dashboard', null, previewPath);
                  }}
                >
                  Preview Public Follow Page
                </button>
              </div>
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
              {['lara', 'incorporation'].includes(documentType) && <p className="helper-text">Enter the LARA / incorporation number exactly as printed field.</p>}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                          <p className="muted-text">Type: {doc.documentType}</p>
                          <button
                            type="button"
                            className="button button-ghost"
                            aria-label={`Delete ${doc.originalFileName}`}
                            onClick={() => handleDeleteDocument(doc.id)}
                            style={{ minWidth: 'auto', padding: '2px 8px', fontSize: '1rem', lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </div>
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
              <div className="field" style={{ marginTop: '14px' }}>
                <label className="label">
                  <a href="https://mibusinessregistry.lara.state.mi.us/search/business" target="_blank" rel="noopener noreferrer">
                    LARA / Articles of Incorporation Number
                  </a>
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.laraNumber}
                  onChange={(e) => handleChange('laraNumber', e.target.value)}
                  placeholder="Enter your LARA / incorporation number"
                />
                <p className="helper-text">You can type this manually or auto-fill it from an uploaded LARA/Incorporation document.</p>
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
                {badgeCategories.length === 0 ? <p className="helper-text">No badge categories are available yet.</p> : null}
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
                {!selectedBadgeCategory ? <p className="helper-text">Choose a category first to load matching badges.</p> : null}
                {selectedBadgeDetails ? <p className="helper-text">{selectedBadgeDetails.description}</p> : null}
              </div>
              <div className="field">
                <label className="label">Impact notes</label>
                <textarea
                  className="input"
                  rows="3"
                  value={requestForm.business_notes}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, business_notes: e.target.value }))}
                  placeholder="Share your action and why it matters to the community." required
                />
              </div>
              <div className="field">
                <label className="label">Supporting document (required)</label>
                <select
                  className="input"
                  value={requestForm.linked_document_id}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, linked_document_id: e.target.value }))}
                >
                  <option value="">Choose a supporting document</option>
                  {businessDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.documentType} — {doc.originalFileName} ({doc.status})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Evidence URL (optional)</label>
                <input
                  className="input"
                  type="url"
                  value={requestForm.evidence_url}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, evidence_url: e.target.value }))}
                  placeholder="https://example.com/proof"
                />
              </div>
              <div className="field">
                <label className="label">How this URL proves your request {requestForm.evidence_url.trim() ? '(required)' : '(optional)'}</label>
                <textarea
                  className="input"
                  rows="2"
                  maxLength={500}
                  value={requestForm.evidence_explanation}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, evidence_explanation: e.target.value }))}
                  placeholder="Explain how the URL supports this badge request (500 characters max)."
                />
                <p className="helper-text">{requestForm.evidence_explanation.length}/500 characters</p>
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
                        {item.evidenceUrl ? <p className="muted-text">Evidence URL: <a href={item.evidenceUrl} target="_blank" rel="noreferrer">{item.evidenceUrl}</a></p> : null}
                        {item.evidenceExplanation ? <p className="muted-text">Evidence explanation: {item.evidenceExplanation}</p> : null}
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

export const ContactSupport = ({ onNavigate, prefill }) => {
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
// SHAREABLE LINK BAR
// =============================================================================

export const ShareableLinkBar = ({ url }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };
  return (
    <div style={{
      width: '100%', maxWidth: 320,
      background: '#F4F7FF', border: '1.5px solid #E8EDF8',
      borderRadius: 12, padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#6B85B5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Can't scan? Share this link
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontSize: 12, color: '#0047cc', fontWeight: 600, wordBreak: 'break-all', lineHeight: 1.4 }}>
          {url}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flexShrink: 0, background: copied ? '#0047cc' : '#f59e0b',
            color: copied ? '#f59e0b' : '#0047cc', border: 'none',
            borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// SAVE CONTACT BUTTON
// =============================================================================

export const SaveContactButton = ({ slug }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!slug) return;
    setSaving(true);
    try {
      const res = await customerApi.get(
        `/public/businesses/${encodeURIComponent(slug)}/vcard`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/vcard' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.vcf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      window.location.href = `${customerApi.defaults.baseURL}/public/businesses/${encodeURIComponent(slug)}/vcard`;
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      style={{
        width: '100%', maxWidth: 320,
        background: '#0047cc', color: '#f59e0b',
        border: 'none', borderRadius: 12,
        padding: '12px 20px', fontSize: 13, fontWeight: 800,
        cursor: saving ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'opacity 0.2s', opacity: saving ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize: 16 }}>👤</span>
      {saving ? 'Saving…' : 'Save Contact'}
    </button>
  );
};

// =============================================================================
// NFC DEVICES PAGE
// =============================================================================

const CHIP_TYPES = ['NTAG213', 'NTAG215', 'NTAG216', 'MIFARE'];

export const NfcDevicesPage = ({ business, onNavigate, onLogout }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [chipType, setChipType] = useState('NTAG213');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchDevices = React.useCallback(async () => {
    try {
      const res = await api.get('/nfc/devices');
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Failed to load NFC devices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/nfc/devices', { label: label.trim(), chip_type: chipType });
      setDevices((prev) => [res.data, ...prev]);
      setLabel('');
      setSuccess('Device registered! Copy the URL below and program it onto your NFC chip.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to register device.'));
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (device) => {
    try {
      const res = await api.put(`/nfc/devices/${device.id}`, { is_active: !device.is_active });
      setDevices((prev) => prev.map((d) => d.id === device.id ? res.data : d));
    } catch {
      setError('Failed to update device.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this NFC device?')) return;
    try {
      await api.delete(`/nfc/devices/${id}`);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Failed to remove device.');
    }
  };

  const handleCopy = (id, url) => {
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="page">
      <div className="card card--wide">
        <BusinessAccountMenu
          businessName={business.name}
          onNavigate={onNavigate}
          onLogout={onLogout}
          currentView="nfc-devices"
          includeProfile
        />

        <div className="stack-md" style={{ marginTop: '24px' }}>
          <div>
            <h1 className="heading-lg">NFC Devices</h1>
            <p className="subtitle">
              Register your NFC business cards or smart bracelets. Each device gets a URL to
              program onto the chip — when someone taps it, they land on your profile and the
              tap is tracked separately from QR scans.
            </p>
          </div>

          <div className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
            <h2 className="heading-md">Register a New Device</h2>
            <form onSubmit={handleAdd} className="stack-sm" style={{ marginTop: '12px' }}>
              <div className="field">
                <label className="label">Device label</label>
                <input
                  className="input"
                  type="text"
                  placeholder='e.g. "Gold business card" or "Blue bracelet"'
                  maxLength={100}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label">Chip type</label>
                <select className="input" value={chipType} onChange={(e) => setChipType(e.target.value)}>
                  {CHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <p className="helper-text">NTAG213 is the most common chip in business cards and bracelets.</p>
              </div>
              {error && <p className="alert alert-error">{error}</p>}
              {success && <p className="alert alert-success">{success}</p>}
              <button type="submit" className="button button-primary" disabled={adding || !label.trim()}>
                {adding ? 'Registering…' : 'Register Device'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="heading-md">Your Devices</h2>
            {loading ? (
              <p className="subtitle">Loading…</p>
            ) : devices.length === 0 ? (
              <div className="empty-state">No NFC devices registered yet. Add one above.</div>
            ) : (
              <div className="stack-sm" style={{ marginTop: '12px' }}>
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="card"
                    style={{
                      border: `1px solid ${device.is_active ? 'var(--border)' : '#e5e7eb'}`,
                      boxShadow: 'none',
                      opacity: device.is_active ? 1 : 0.6,
                    }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{device.label}</div>
                        <div className="muted-text" style={{ fontSize: '12px', marginTop: '2px' }}>
                          {device.chip_type} · Registered {new Date(device.created_at).toLocaleDateString()}
                          {' · '}
                          <span style={{ color: device.is_active ? 'var(--success, #16a34a)' : '#9ca3af', fontWeight: 600 }}>
                            {device.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="row" style={{ gap: '8px', flexShrink: 0 }}>
                        <button type="button" className="button button-secondary button-sm" onClick={() => handleToggleActive(device)}>
                          {device.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="button button-sm"
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
                          onClick={() => handleDelete(device.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', background: '#F4F7FF', border: '1.5px solid #E8EDF8', borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B85B5', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Program this URL onto the chip
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#0047cc', fontWeight: 600, wordBreak: 'break-all', lineHeight: 1.4 }}>
                          {device.encoded_url}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(device.id, device.encoded_url)}
                          style={{
                            flexShrink: 0,
                            background: copiedId === device.id ? '#0047cc' : '#f59e0b',
                            color: copiedId === device.id ? '#f59e0b' : '#0047cc',
                            border: 'none', borderRadius: '8px',
                            padding: '7px 12px', fontSize: '11px', fontWeight: 800,
                            cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                          }}
                        >
                          {copiedId === device.id ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ border: '1px solid #E8EDF8', background: '#F4F7FF', boxShadow: 'none', textAlign: 'center', padding: '32px 24px' }}>
            <h3 className="heading-sm" style={{ marginBottom: '8px' }}>Order NFC Cards &amp; Bracelets</h3>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
              Order pre-programmed NFC business cards and smart bracelets directly through Follow Us Everywhere. Coming soon.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {['TapTag', 'Tagstand', 'MoreRFID'].map(vendor => (
                <div key={vendor} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                  {vendor}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN APP
// =============================================================================
