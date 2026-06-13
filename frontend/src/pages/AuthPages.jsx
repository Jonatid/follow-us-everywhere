import React, { useState, useEffect } from 'react';
import { api, customerApi, getApiErrorMessage, PASSWORD_HELPER, PASSWORD_REGEX } from '../services/appApi';
import { BackLink } from '../components/BackLink';

export const BusinessSignup = ({ onNavigate, onLoginSuccess }) => {
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

export const BusinessLogin = ({ onNavigate, onLoginSuccess }) => {
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

export const CustomerSignup = ({ onNavigate, onAuthSuccess, initialMessage = '' }) => {
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

export const CustomerLogin = ({ onNavigate, onAuthSuccess, initialMessage = '' }) => {
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

export const CustomerForgotPassword = ({ onNavigate }) => {
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

export const CustomerResetPassword = ({ onNavigate, token, onResetSuccess }) => {
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
