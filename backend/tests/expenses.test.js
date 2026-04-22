process.env.NODE_ENV = 'test';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');

const BASE = { amount: 150.75, category: 'Food', description: 'Lunch', date: '2026-04-20' };

describe('POST /expenses', () => {
  test('creates a new expense and returns 201', async () => {
    const res = await request(app).post('/expenses').send(BASE);
    assert.equal(res.status, 201);
    assert.equal(res.body.amount, 150.75);
    assert.equal(res.body.category, 'Food');
    assert.ok(res.body.id);
    assert.ok(res.body.created_at);
  });

  test('is idempotent — same key returns 200 with same id', async () => {
    const key = 'idempotency-test-key-001';
    const first = await request(app).post('/expenses').send({ ...BASE, idempotency_key: key });
    const second = await request(app).post('/expenses').send({ ...BASE, idempotency_key: key });
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(first.body.id, second.body.id);
  });

  test('rejects negative amount with 400', async () => {
    const res = await request(app).post('/expenses').send({ ...BASE, amount: -10 });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('rejects zero amount with 400', async () => {
    const res = await request(app).post('/expenses').send({ ...BASE, amount: 0 });
    assert.equal(res.status, 400);
  });

  test('rejects missing category with 400', async () => {
    const res = await request(app).post('/expenses').send({ ...BASE, category: '' });
    assert.equal(res.status, 400);
  });

  test('rejects invalid date with 400', async () => {
    const res = await request(app).post('/expenses').send({ ...BASE, date: 'not-a-date' });
    assert.equal(res.status, 400);
  });

  test('stores money without float drift (₹0.10)', async () => {
    const res = await request(app).post('/expenses').send({ ...BASE, amount: 0.1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.amount, 0.1);
  });
});

describe('GET /expenses', () => {
  before(async () => {
    await request(app).post('/expenses').send({ amount: 50, category: 'Transport', description: 'Bus', date: '2026-04-18', idempotency_key: 'g1' });
    await request(app).post('/expenses').send({ amount: 200, category: 'Food', description: 'Dinner', date: '2026-04-22', idempotency_key: 'g2' });
    await request(app).post('/expenses').send({ amount: 80, category: 'Food', description: 'Snack', date: '2026-04-19', idempotency_key: 'g3' });
  });

  test('returns all expenses', async () => {
    const res = await request(app).get('/expenses');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 3);
  });

  test('filters by category', async () => {
    const res = await request(app).get('/expenses?category=Transport');
    assert.equal(res.status, 200);
    assert.ok(res.body.every(e => e.category === 'Transport'));
  });

  test('sorts by date desc', async () => {
    const res = await request(app).get('/expenses?category=Food&sort=date_desc');
    assert.equal(res.status, 200);
    const dates = res.body.map(e => e.date);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    assert.deepEqual(dates, sorted);
  });
});
