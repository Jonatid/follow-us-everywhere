const SLUG_FALLBACK = 'business';

const slugifyValue = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || SLUG_FALLBACK;
};

const resolveUniqueBusinessSlug = async (client, { slug, name, excludeBusinessId = null }) => {
  const baseSlug = slugifyValue(slug || name);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const params = [candidate];
    let sql = 'SELECT id FROM businesses WHERE slug = $1';

    if (excludeBusinessId) {
      params.push(excludeBusinessId);
      sql += ' AND id <> $2';
    }

    const existingResult = await client.query(sql, params);
    if (existingResult.rows.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

module.exports = {
  slugifyValue,
  resolveUniqueBusinessSlug,
};
