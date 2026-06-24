const express = require('express');
const router = express.Router();

const LOCAL_FOODS = [
  { name: 'Chicken breast, cooked', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Chicken thigh, cooked', calories: 209, protein: 26, carbs: 0, fat: 10.9 },
  { name: 'Egg, large', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { name: 'White rice, cooked', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Banana', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
];

const numberFrom = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 10) / 10 : 0;
};

const normalizeLocalFood = (food) => ({
  id: `local-${food.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name: food.name,
  servingSize: '100 g',
  calories: numberFrom(food.calories),
  protein: numberFrom(food.protein),
  carbs: numberFrom(food.carbs),
  fat: numberFrom(food.fat),
  source: 'local'
});

const localSearch = (query) => {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return LOCAL_FOODS.filter((food) => food.name.toLowerCase().includes(term)).map(normalizeLocalFood);
};

const normalizeOpenFoodFactsProduct = (product) => {
  const nutriments = product.nutriments || {};
  return {
    id: product.code ? `off-${product.code}` : `off-${product.product_name}`,
    name: product.product_name || product.generic_name || 'Unknown food',
    brand: product.brands || '',
    servingSize: product.serving_size || '100 g',
    calories: numberFrom(nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g']),
    protein: numberFrom(nutriments.proteins_serving ?? nutriments.proteins_100g),
    carbs: numberFrom(nutriments.carbohydrates_serving ?? nutriments.carbohydrates_100g),
    fat: numberFrom(nutriments.fat_serving ?? nutriments.fat_100g),
    source: 'openfoodfacts'
  };
};

const searchOpenFoodFacts = async (query, signal) => {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '10');
  url.searchParams.set('fields', 'code,product_name,generic_name,brands,serving_size,nutriments');

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'FollowUsEverywhere/1.0 food-search' },
    signal
  });

  if (!response.ok) throw new Error(`Open Food Facts returned ${response.status}`);
  const payload = await response.json();
  return (payload.products || [])
    .map(normalizeOpenFoodFactsProduct)
    .filter((food) => food.name && (food.calories || food.protein || food.carbs || food.fat));
};

router.get('/search', async (req, res) => {
  const query = String(req.query.query || req.query.q || '').trim();
  if (query.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const remoteResults = await searchOpenFoodFacts(query, controller.signal);
    const fallbackResults = localSearch(query);
    const seen = new Set();
    const results = [...fallbackResults, ...remoteResults].filter((food) => {
      const key = food.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    res.json({ results, fallback: false });
  } catch (error) {
    res.json({ results: localSearch(query), fallback: true });
  } finally {
    clearTimeout(timeout);
  }
});

module.exports = router;
