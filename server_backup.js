require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PORT = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', async (req, res, next) => {
  try {
    const search = `%${req.query.search || ''}%`;
    const category = req.query.category || '';
    const result = await pool.query(`SELECT p.*, c.name AS category FROM products p JOIN categories c ON c.id = p.category_id WHERE (p.name ILIKE $1 OR p.description ILIKE $1) AND ($2 = '' OR c.name = $2) ORDER BY p.id`, [search, category]);
    res.json(result.rows);
  } catch (error) { next(error); }
});
app.get('/api/categories', async (_req, res, next) => {
  try { res.json((await pool.query('SELECT name FROM categories ORDER BY name')).rows); }
  catch (error) { next(error); }
});
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Name, email, and a 6+ character password are required.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name.trim(), email.toLowerCase(), passwordHash]);
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, name: user.name }, secret, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (error) { if (error.code === '23505') return res.status(409).json({ message: 'That email is already registered.' }); next(error); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = (await pool.query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()])).rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    const token = jwt.sign({ id: user.id, name: user.name }, secret, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) { next(error); }
});
function requireUser(req, res, next) {
  try { req.user = jwt.verify(req.headers.authorization?.replace('Bearer ', ''), secret); next(); }
  catch (_error) { res.status(401).json({ message: 'Please log in first.' }); }
}
app.post('/api/orders', requireUser, async (req, res) => {
  const client = await pool.connect();
  try {
    const items = req.body.items;
    if (!Array.isArray(items) || !items.length) throw new Error('Your cart is empty.');
    await client.query('BEGIN'); let total = 0; const verified = [];
    for (const item of items) {
      const product = (await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId])).rows[0];
      if (!product || item.quantity < 1 || product.stock < item.quantity) throw new Error(`${product?.name || 'A product'} is out of stock.`);
      total += Number(product.price) * item.quantity; verified.push({ product, quantity: item.quantity });
    }
    const order = (await client.query('INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *', [req.user.id, total])).rows[0];
    for (const { product, quantity } of verified) {
      await client.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', [order.id, product.id, quantity, product.price]);
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product.id]);
    }
    await client.query('COMMIT'); res.status(201).json({ order });
  } catch (error) { await client.query('ROLLBACK'); res.status(400).json({ message: error.message || 'Could not place order.' }); }
  finally { client.release(); }
});
app.get('/api/orders/me', requireUser, async (req, res, next) => {
  try { res.json((await pool.query('SELECT id, total, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id])).rows); }
  catch (error) { next(error); }
});
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Something went wrong on the server.' }); });
app.listen(PORT, () => console.log(`Siva Mart is running at http://localhost:${PORT}`));
