const resolveVerificationStatus = (business = {}) => {
  const status = business.verificationStatus ?? business.verification_status;
  if (status) {
    return status;
  }

  if (business.disabled_at || business.disabledAt) {
    return 'disabled';
  }

  if (business.suspended_at || business.suspendedAt || business.suspended_reason || business.suspendedReason) {
    return 'suspended';
  }

  if (business.is_approved === false || business.isApproved === false) {
    return 'flagged';
  }

  if (business.is_approved === true || business.isApproved === true || business.is_verified === true || business.isVerified === true) {
    return 'active';
  }

  return 'active';
};

module.exports = { resolveVerificationStatus };
