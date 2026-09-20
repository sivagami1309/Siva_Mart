CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(80) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE categories (id SERIAL PRIMARY KEY, name VARCHAR(60) UNIQUE NOT NULL);
CREATE TABLE products (id SERIAL PRIMARY KEY, category_id INTEGER REFERENCES categories(id), name VARCHAR(120) NOT NULL, description TEXT NOT NULL, price NUMERIC(10,2) NOT NULL CHECK (price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), emoji VARCHAR(10) NOT NULL);
CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) NOT NULL, total NUMERIC(10,2) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'Placed', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE order_items (id SERIAL PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL, product_id INTEGER REFERENCES products(id) NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0), price NUMERIC(10,2) NOT NULL);
INSERT INTO categories (name) VALUES ('Fresh Produce'), ('Dairy & Eggs'), ('Pantry'), ('Snacks'), ('Beverages');
INSERT INTO products (category_id, name, description, price, stock, emoji) VALUES
  (1, 'Farm Fresh Bananas', 'Naturally sweet ripe bananas, 1 kg.', 48.00, 40, '🍌'),
  (1, 'Red Tomatoes', 'Juicy tomatoes for everyday cooking, 500 g.', 35.00, 55, '🍅'),
  (2, 'Whole Milk', 'Fresh pasteurized milk, 1 litre.', 62.00, 30, '🥛'),
  (2, 'Free Range Eggs', 'A tray of 6 nutritious eggs.', 78.00, 25, '🥚'),
  (3, 'Basmati Rice', 'Premium long-grain rice, 1 kg.', 145.00, 42, '🍚'),
  (3, 'Cold Pressed Oil', 'Groundnut cooking oil, 1 litre.', 210.00, 18, '🫙'),
  (4, 'Masala Chips', 'Crispy potato chips with Indian spices.', 30.00, 80, '🥔'),
  (5, 'Mango Juice', 'Refreshing mango fruit drink, 1 litre.', 95.00, 35, '🥭');
