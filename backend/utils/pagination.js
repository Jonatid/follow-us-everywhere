const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const parseNonNegativeInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (!/^\d+$/.test(String(value))) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return Number.parseInt(value, 10);
};

const parsePagination = (query, options = {}) => {
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = options.maxLimit || MAX_LIMIT;
  const parsedLimit = parseNonNegativeInteger(query.limit, 'limit');
  const parsedOffset = parseNonNegativeInteger(query.offset, 'offset');
  const limit = parsedLimit === null ? defaultLimit : parsedLimit;
  const offset = parsedOffset === null ? 0 : parsedOffset;

  if (limit < 1 || limit > maxLimit) {
    throw new Error(`limit must be between 1 and ${maxLimit}`);
  }

  return { limit, offset };
};

const buildPaginationMeta = (total, limit, offset) => ({
  total: Number(total || 0),
  limit,
  offset,
  hasMore: offset + limit < Number(total || 0),
});

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  buildPaginationMeta,
};
