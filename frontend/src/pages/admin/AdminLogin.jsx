import React, { useMemo, useState } from 'react';
import { adminLogin } from '../../utils/adminApi';

const AdminLogin = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [requires2fa, setRequires2fa] = useState(false);
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState([]);
  const [postEnrollmentToken, setPostEnrollmentToken] = useState('');
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [useBackupCodeMode, setUseBackupCodeMode] = useState(false);

  const stepTitle = useMemo(() => {
    if (generatedBackupCodes.length) return 'Save backup codes';
    if (enrollment) return 'Set up authenticator app';
    if (requires2fa) return 'Enter authentication code';
    return 'Admin Login';
  }, [enrollment, requires2fa, generatedBackupCodes.length]);

  const handlePrimarySignIn = async () => {
    setError('');
    if (!email || !password) {
      setError('Please provide your admin email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await adminLogin({ email, password });
      if (data?.requires2faEnrollment) {
        setEnrollment(data.enrollment || null);
        setRequires2fa(false);
        setChallengeMessage('');
        return;
      }

      if (data?.requires2fa) {
        setRequires2fa(true);
        setEnrollment(null);
        setChallengeMessage(data?.message || data?.challengeMessage || '');
        setTotpCode('');
        setBackupCode('');
        setUseBackupCodeMode(false);
        return;
      }

      if (data?.token) {
        localStorage.setItem('adminToken', data.token);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in as admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeEnrollment = async () => {
    setError('');
    if (!enrollment?.enrollmentToken || !totpCode) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const data = await adminLogin({
        enrollmentToken: enrollment.enrollmentToken,
        totpCode,
      });

      setEnrollment(null);
      setRequires2fa(false);
      setTotpCode('');

      if (data?.token) {
        setPostEnrollmentToken(data.token);
      }
      setGeneratedBackupCodes(Array.isArray(data?.backupCodes) ? data.backupCodes : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to complete enrollment.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondFactor = async () => {
    setError('');
    if (useBackupCodeMode && !backupCode) {
      setError('Enter a backup code.');
      return;
    }

    if (!useBackupCodeMode && !totpCode) {
      setError('Enter your 6-digit authentication code.');
      return;
    }

    setLoading(true);
    try {
      const data = await adminLogin({
        email,
        password,
        totpCode: useBackupCodeMode ? undefined : totpCode,
        backupCode: useBackupCodeMode ? backupCode : undefined,
      });

      if (data?.token) {
        localStorage.setItem('adminToken', data.token);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterBackupCodes = () => {
    if (!backupCodesSaved) {
      setError('Please confirm you saved your backup codes before continuing.');
      return;
    }

    if (postEnrollmentToken) {
      localStorage.setItem('adminToken', postEnrollmentToken);
    }

    onSuccess();
  };

  return (
    <div className="admin-shell">
      <main className="admin-content">
        <div className="admin-card" style={{ maxWidth: 420, margin: '0 auto' }}>
          <div className="admin-topbar">
            <h1>{stepTitle}</h1>
          </div>
          {error && <div className="admin-alert">{error}</div>}

          {!enrollment && !requires2fa && generatedBackupCodes.length === 0 && (
            <div className="admin-form">
              <label>
                Email
                <input
                  type="email"
                  className="admin-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  className="admin-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <button type="button" className="admin-button primary" onClick={handlePrimarySignIn} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          )}

          {enrollment && (
            <div className="admin-form">
              <p>Scan this URI in your authenticator app, then enter the 6-digit code.</p>
              <textarea
                readOnly
                className="admin-input"
                style={{ minHeight: 88 }}
                value={enrollment.otpauthUri || ''}
              />
              <label>
                6-digit code
                <input
                  type="text"
                  className="admin-input"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                />
              </label>
              <button type="button" className="admin-button primary" onClick={handleFinalizeEnrollment} disabled={loading}>
                {loading ? 'Confirming...' : 'Confirm setup'}
              </button>
            </div>
          )}

          {requires2fa && (
            <div className="admin-form">
              <h2 style={{ marginTop: 0 }}>Enter authentication code</h2>
              {challengeMessage && <p>{challengeMessage}</p>}

              {!useBackupCodeMode && (
                <label>
                  6-digit authentication code
                  <input
                    type="text"
                    className="admin-input"
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                  />
                </label>
              )}

              {useBackupCodeMode && (
                <label>
                  Backup code
                  <input
                    type="text"
                    className="admin-input"
                    value={backupCode}
                    onChange={(event) => setBackupCode(event.target.value.toUpperCase())}
                    placeholder="ABCD-EFGH-IJKL"
                  />
                </label>
              )}

              <button type="button" className="admin-button primary" onClick={handleVerifySecondFactor} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify code'}
              </button>

              <button
                type="button"
                className="admin-button"
                onClick={() => {
                  setUseBackupCodeMode((prev) => !prev);
                  setError('');
                }}
                disabled={loading}
              >
                {useBackupCodeMode ? 'Use authenticator code instead' : 'Use backup code instead'}
              </button>
            </div>
          )}

          {generatedBackupCodes.length > 0 && (
            <div className="admin-form">
              <p>Save these backup codes now. Each code can only be used once.</p>
              <pre className="admin-input" style={{ whiteSpace: 'pre-wrap' }}>{generatedBackupCodes.join('\n')}</pre>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={backupCodesSaved}
                  onChange={(event) => setBackupCodesSaved(event.target.checked)}
                />
                I saved these backup codes.
              </label>
              <button type="button" className="admin-button primary" onClick={handleContinueAfterBackupCodes}>
                Continue to dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
