-- Sample data helps the product screen in Checkpoint 2.
INSERT INTO users (full_name, email, password_hash, role) VALUES
    ('Siva Mart Store', 'seller@sivamart.local', 'not-a-real-password', 'seller');

INSERT INTO sellers (user_id, store_name) VALUES
    (1, 'Siva Mart Fresh Store');

INSERT INTO categories (name) VALUES
    ('Fresh Produce'), ('Dairy and Eggs'), ('Pantry'), ('Snacks'), ('Beverages');

INSERT INTO products (seller_id, category_id, name, description, price, stock, image_url) VALUES
    (1, 1, 'Farm Fresh Bananas', 'Naturally sweet bananas, 1 kg.', 48.00, 40, NULL),
    (1, 1, 'Red Tomatoes', 'Juicy tomatoes for home cooking, 500 g.', 35.00, 55, NULL),
    (1, 2, 'Whole Milk', 'Fresh pasteurized milk, 1 litre.', 62.00, 30, NULL),
    (1, 3, 'Basmati Rice', 'Premium long-grain rice, 1 kg.', 145.00, 42, NULL),
    (1, 4, 'Masala Chips', 'Crispy potato chips with Indian spices.', 30.00, 80, NULL),
    (1, 5, 'Mango Juice', 'Refreshing mango fruit drink, 1 litre.', 95.00, 35, NULL);
