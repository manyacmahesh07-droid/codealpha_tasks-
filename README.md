# Orbit Market

A full-stack e-commerce project built with HTML, CSS, JavaScript, Express.js, and a persistent JSON data store.

## Features

- Responsive curated product listing with category filters
- Dedicated product-detail view
- Session-backed shopping cart with quantity controls
- Secure registration and login (passwords are hashed with bcrypt)
- Checkout flow and persisted orders
- Account area with order history
- Polished, original responsive storefront design

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

The first account or order automatically creates `data/store.json`. This file is intentionally excluded from Git so each installation begins with fresh local data.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Authentication: express-session + bcryptjs
- Storage: JSON file data store (users and orders), designed to be straightforward to replace with SQLite or MongoDB for deployment
