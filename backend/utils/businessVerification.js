const PERSONAL_PROFILE_POLICY = {
  code: 'BUSINESS_ONLY_LINKS',
  text: 'Links must point to business or organization profiles. Personal-profile links (e.g., LinkedIn /in/) are not allowed.'
};

const NUDGE_SUBJECT = 'Action required: update your social links';

const getNudgeMessage = (businessName) =>
  `Action required for ${businessName || 'your account'}: Please update your social links to business or organization profiles only. ` +
  'We detected a link that appears to be a personal profile (for example, LinkedIn /in/). ' +
  'Update your links within 7 days to avoid suspension. If you believe this is a mistake, contact support.';

const isLikelyPersonalProfile = (url = '') => {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('linkedin.com/in/') ||
    normalized.includes('linkedin.com/pub/') ||
    normalized.includes('facebook.com/profile.php') ||
    normalized.includes('facebook.com/people/')
  );
};

const autoDisableBusiness = async (client, business) => {
  if (business.verification_status !== 'suspended' || !business.suspended_at) {
    return business;
  }

  const suspendedAt = new Date(business.suspended_at);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (Number.isNaN(suspendedAt.getTime())) {
    return business;
  }

  if (Date.now() - suspendedAt.getTime() < sevenDaysMs) {
    return business;
  }

  const result = await client.query(
    `UPDATE businesses
     SET verification_status = 'disabled',
         disabled_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [business.id]
  );

  return result.rows[0] || business;
};

const ensureEditableBusiness = async (client, businessId) => {
  const result = await client.query(
    'SELECT id, verification_status, suspended_at FROM businesses WHERE id = $1',
    [businessId]
  );

  if (result.rows.length === 0) {
    return { error: { status: 404, message: 'Business not found' } };
  }

  const business = await autoDisableBusiness(client, result.rows[0]);

  if (business.verification_status === 'suspended') {
    return { error: { status: 403, message: 'Account suspended' } };
  }

  if (business.verification_status === 'disabled') {
    return { error: { status: 403, message: 'Account disabled' } };
  }

  return { business };
};

module.exports = {
  PERSONAL_PROFILE_POLICY,
  NUDGE_SUBJECT,
  getNudgeMessage,
  isLikelyPersonalProfile,
  autoDisableBusiness,
  ensureEditableBusiness,
};
