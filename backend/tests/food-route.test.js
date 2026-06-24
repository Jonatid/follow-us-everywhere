const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const foodRoutes = require('../routes/food');

test('food search returns local nutrition fallback for common foods', async () => {
  const app = express();
  app.use('/api/food', foodRoutes);

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/food/search?query=Chicken`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.results));
    assert.ok(body.results.some((food) => food.name === 'Chicken breast, cooked'));
    const chicken = body.results.find((food) => food.name === 'Chicken breast, cooked');
    assert.equal(chicken.calories, 165);
    assert.equal(chicken.protein, 31);
    assert.equal(chicken.carbs, 0);
    assert.equal(chicken.fat, 3.6);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('food search validates short queries', async () => {
  const app = express();
  app.use('/api/food', foodRoutes);

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/food/search?query=C`);
    assert.equal(response.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
