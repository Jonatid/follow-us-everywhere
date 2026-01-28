const resolveVerificationStatus = (business = {}) => {
  // Single source of truth: verification_status (snake_case) / verificationStatus (camelCase)
  const status = business.verification_status ?? business.verificationStatus;

  // If it exists, use it exactly (active | flagged | suspended | disabled)
  if (typeof status === 'string' && status.trim().length > 0) {
    return status.trim();
  }

  // Auto-approved default (your choice "A")
  return 'active';
};

const buildAccountRestrictionError = (business = {}) => {
  const verificationStatus = resolveVerificationStatus(business);

  if (!['suspended', 'disabled'].includes(verificationStatus)) {
    return null;
  }

  const policyCode = business.policy_violation_code ?? business.policyViolationCode ?? null;
  const policyText = business.policy_violation_text ?? business.policyViolationText ?? null;
  const nudgeMessage = business.nudge_message ?? business.nudgeMessage ?? null;

  const defaultMessage =
    verificationStatus === 'suspended'
      ? 'Your account is suspended while we review a policy issue.'
      : 'Your account is disabled. Please contact support if you believe this is a mistake.';

  return {
    error: verificationStatus === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_DISABLED',
    message: nudgeMessage || policyText || defaultMessage,
    policyCode,
    policyText,
    nudgeMessage,
  };
};

module.exports = { resolveVerificationStatus, buildAccountRestrictionError };
