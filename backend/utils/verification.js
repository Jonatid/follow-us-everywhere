const resolveVerificationStatus = (business = {}) => {
  const status = business.verification_status ?? business.verificationStatus;

  if (typeof status === 'string' && status.trim().length > 0) {
    return status.trim();
  }

  if (business.disabled_at || business.disabledAt) {
    return 'disabled';
  }

  if (business.suspended_at || business.suspendedAt) {
    return 'suspended';
  }

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
