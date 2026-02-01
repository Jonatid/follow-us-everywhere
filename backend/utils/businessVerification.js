const db = require('../config/db');

const NUDGE_SUBJECT = 'Action required: update your business profile';

const applyBusinessRestriction = async ({
  businessId,
  verificationStatus,
  suspendedAt,
  disabledAt,
  policyViolationCode,
  policyViolationText,
  nudgeMessage,
}) => {
  if (!businessId) {
    throw new Error('businessId is required');
  }

  const result = await db.query(
    `UPDATE businesses
     SET verification_status = $2,
         suspended_at = $3,
         disabled_at = $4,
         policy_violation_code = $5,
         policy_violation_text = $6,
         nudge_message = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id,
               verification_status,
               suspended_at,
               disabled_at,
               policy_violation_code,
               policy_violation_text,
               nudge_message`,
    [
      businessId,
      verificationStatus,
      suspendedAt,
      disabledAt,
      policyViolationCode ?? null,
      policyViolationText ?? null,
      nudgeMessage ?? null,
    ]
  );

  return result.rows[0];
};

const autoDisableBusiness = async ({
  businessId,
  policyViolationCode,
  policyViolationText,
  nudgeMessage,
}) =>
  applyBusinessRestriction({
    businessId,
    verificationStatus: 'disabled',
    suspendedAt: null,
    disabledAt: new Date(),
    policyViolationCode,
    policyViolationText,
    nudgeMessage,
  });

const autoSuspendBusiness = async ({
  businessId,
  policyViolationCode,
  policyViolationText,
  nudgeMessage,
}) =>
  applyBusinessRestriction({
    businessId,
    verificationStatus: 'suspended',
    suspendedAt: new Date(),
    disabledAt: null,
    policyViolationCode,
    policyViolationText,
    nudgeMessage,
  });

const autoFlagBusiness = async ({
  businessId,
  policyViolationCode,
  policyViolationText,
  nudgeMessage,
}) =>
  applyBusinessRestriction({
    businessId,
    verificationStatus: 'flagged',
    suspendedAt: null,
    disabledAt: null,
    policyViolationCode,
    policyViolationText,
    nudgeMessage,
  });

module.exports = {
  NUDGE_SUBJECT,
  autoDisableBusiness,
  autoSuspendBusiness,
  autoFlagBusiness,
};
