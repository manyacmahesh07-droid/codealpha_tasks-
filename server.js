const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const storePath = path.join(dataDir, 'store.json');

const catalog = [
  { id: 1, name: 'Halo Desk Light', category: 'Living', price: 89, rating: 4.9, reviews: 118, color: 'Amber', icon: '◒', description: 'A sculptural, dimmable light that brings a soft sunset glow to your workspace.', features: ['Touch dimmer', 'Warm LED', 'USB-C powered'] },
  { id: 2, name: 'Drift Ceramic Set', category: 'Kitchen', price: 64, rating: 4.8, reviews: 86, color: 'Rose', icon: '◌', description: 'Four hand-finished ceramic cups made for slower mornings and better conversations.', features: ['Set of four', 'Dishwasher safe', 'Matte glaze'] },
  { id: 3, name: 'Field Notes Tote', category: 'Everyday', price: 38, rating: 4.7, reviews: 205, color: 'Sage', icon: '✦', description: 'A thoughtfully sized everyday tote in durable recycled canvas.', features: ['Recycled canvas', 'Interior pocket', 'Machine washable'] },
  { id: 4, name: 'Arc Wireless Speaker', category: 'Tech', price: 129, rating: 4.9, reviews: 72, color: 'Blue', icon: '⌁', description: 'Small in size, expansive in sound. Designed to move with your day.', features: ['18-hour battery', 'Bluetooth 5.3', 'Water resistant'] },
  { id: 5, name: 'Sunday Throw', category: 'Living', price: 76, rating: 4.8, reviews: 144, color: 'Lilac', icon: '≈', description: 'An irresistibly soft throw, woven to make any corner feel like home.', features: ['Organic cotton', '130 × 170 cm', 'Fringed edge'] },
  { id: 6, name: 'Moss Planter', category: 'Living', price: 46, rating: 4.6, reviews: 91, color: 'Moss', icon: '◐', description: 'A minimal planter with a glazed finish and clever hidden drainage tray.', features: ['Includes drainage tray', 'Stoneware', 'Indoor use'] }
];

function readStore() {
  if (!fs.existsSync(storePath)) return { users: [], orders: [] };
  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}
function writeStore(data) { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(storePath, JSON.stringify(data, null, 2)); }
function cart(req) { return req.session.cart || (req.session.cart = []); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }

app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'orbit-market-change-this-secret', resave: false, saveUninitialized: true, cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', (req, res) => res.json(catalog));
app.get('/api/products/:id', (req, res) => {
  const product = catalog.find(p => p.id === Number(req.params.id));
  product ? res.json(product) : res.status(404).json({ message: 'Product not found' });
});
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = readStore().users.find(u => u.id === req.session.userId);
  res.json({ user: user ? publicUser(user) : null });
});
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.includes('@') || !password || password.length < 6) return res.status(400).json({ message: 'Use a name, valid email, and password of 6+ characters.' });
  const db = readStore();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ message: 'An account already exists with that email.' });
  const user = { id: Date.now(), name: name.trim(), email: email.toLowerCase(), password: await bcrypt.hash(password, 10), createdAt: new Date().toISOString() };
  db.users.push(user); writeStore(db); req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});
app.post('/api/auth/login', async (req, res) => {
  const db = readStore(); const user = db.users.find(u => u.email === req.body.email?.toLowerCase());
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ message: 'Incorrect email or password.' });
  req.session.userId = user.id; res.json({ user: publicUser(user) });
});
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/cart', (req, res) => res.json({ items: cart(req) }));
app.post('/api/cart', (req, res) => {
  const product = catalog.find(p => p.id === Number(req.body.productId));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const items = cart(req); const existing = items.find(i => i.productId === product.id);
  existing ? existing.quantity += 1 : items.push({ productId: product.id, quantity: 1 });
  res.json({ items });
});
app.patch('/api/cart/:id', (req, res) => { const item = cart(req).find(i => i.productId === Number(req.params.id)); if (!item) return res.status(404).end(); item.quantity = Math.max(1, Math.min(10, Number(req.body.quantity) || 1)); res.json({ items: cart(req) }); });
app.delete('/api/cart/:id', (req, res) => { req.session.cart = cart(req).filter(i => i.productId !== Number(req.params.id)); res.json({ items: req.session.cart }); });
app.post('/api/orders', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Please sign in before checkout.' });
  const items = cart(req); if (!items.length) return res.status(400).json({ message: 'Your cart is empty.' });
  const { address, city, postalCode } = req.body;
  if (![address, city, postalCode].every(x => x?.trim())) return res.status(400).json({ message: 'Please complete your delivery address.' });
  const lines = items.map(i => ({ ...i, product: catalog.find(p => p.id === i.productId) }));
  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const db = readStore(); const order = { id: `ORB-${String(Date.now()).slice(-6)}`, userId: req.session.userId, items: lines, total, status: 'Confirmed', delivery: { address, city, postalCode }, createdAt: new Date().toISOString() };
  db.orders.unshift(order); writeStore(db); req.session.cart = []; res.status(201).json({ order });
});
app.get('/api/orders', (req, res) => { if (!req.session.userId) return res.status(401).end(); res.json(readStore().orders.filter(o => o.userId === req.session.userId)); });
app.listen(PORT, () => console.log(`Orbit Market running at http://localhost:${PORT}`));
