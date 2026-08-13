-- ShopSpot marketplace seed data
-- All demo accounts use password: password123
USE shopspot;


CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS shops (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    address VARCHAR(500),
    latitude DOUBLE,
    longitude DOUBLE,
    opening_hours VARCHAR(255),
    phone VARCHAR(50),
    rating DECIMAL(2,1),
    is_open_now BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shop_id BIGINT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2),
    stock_qty INT,
    FOREIGN KEY (shop_id) REFERENCES shops(id)
);

DELETE FROM products;
DELETE FROM shops;
DELETE FROM users;

INSERT INTO users (id, name, email, password, phone, role) VALUES (1, 'Demo Consumer', 'consumer@shopspot.demo', '$2b$12$55aLJZO2QMygtZiWYMTuOO3JozxkNvw9I2x2MZJNuVvi8QZI4QTWe', '+919876500000', 'CONSUMER');
INSERT INTO users (id, name, email, password, phone, role) VALUES (2, 'Ravi Kumar', 'ravi.grocery@shopspot.demo', '$2b$12$55aLJZO2QMygtZiWYMTuOO3JozxkNvw9I2x2MZJNuVvi8QZI4QTWe', '+919876500002', 'SELLER');
INSERT INTO shops (id, owner_id, name, category, address, latitude, longitude, opening_hours, phone, rating, is_open_now) VALUES (1, 2, 'Nilgiris Supermarket', 'Grocery', 'T. Nagar, Chennai', 13.0067, 80.2206, 'Mon-Sun 09:00-21:00', '+919876500002', 4.0, TRUE);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (1, 'Rice 5kg', 320, 24);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (1, 'Toor Dal 1kg', 140, 55);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (1, 'Sunflower Oil 1L', 165, 11);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (1, 'Milk 500ml', 28, 14);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (1, 'Sugar 1kg', 45, 73);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (1, 'Bread', 40, 17);
INSERT INTO users (id, name, email, password, phone, role) VALUES (3, 'Meena Shop', 'meena.veg@shopspot.demo', '$2b$12$55aLJZO2QMygtZiWYMTuOO3JozxkNvw9I2x2MZJNuVvi8QZI4QTWe', '+919876500003', 'SELLER');
INSERT INTO shops (id, owner_id, name, category, address, latitude, longitude, opening_hours, phone, rating, is_open_now) VALUES (2, 3, 'Fresh Mart Vegetables', 'Vegetables & Fruits', 'Sholinganallur, Chennai', 12.901, 80.2279, 'Mon-Sun 09:00-21:00', '+919876500003', 4.0, TRUE);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (2, 'Tomato 1kg', 30, 12);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (2, 'Onion 1kg', 35, 69);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (2, 'Potato 1kg', 25, 32);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (2, 'Banana (dozen)', 50, 9);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (2, 'Apple 1kg', 180, 16);
INSERT INTO users (id, name, email, password, phone, role) VALUES (4, 'Suresh Pharma', 'suresh.pharma@shopspot.demo', '$2b$12$55aLJZO2QMygtZiWYMTuOO3JozxkNvw9I2x2MZJNuVvi8QZI4QTWe', '+919876500004', 'SELLER');
INSERT INTO shops (id, owner_id, name, category, address, latitude, longitude, opening_hours, phone, rating, is_open_now) VALUES (3, 4, 'Apollo Pharmacy', 'Pharmacy', 'T. Nagar, Chennai', 13.0067, 80.221, 'Mon-Sun 09:00-21:00', '+919876500004', 4.1, TRUE);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (3, 'Paracetamol strip', 20, 13);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (3, 'Vitamin C Tablets', 90, 35);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (3, 'Hand Sanitizer 200ml', 75, 16);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (3, 'Bandages', 35, 75);
INSERT INTO users (id, name, email, password, phone, role) VALUES (5, 'Anitha Bakes', 'anitha.bakery@shopspot.demo', '$2b$12$55aLJZO2QMygtZiWYMTuOO3JozxkNvw9I2x2MZJNuVvi8QZI4QTWe', '+919876500005', 'SELLER');
INSERT INTO shops (id, owner_id, name, category, address, latitude, longitude, opening_hours, phone, rating, is_open_now) VALUES (4, 5, 'Hot Chips Bakery', 'Bakery', 'Kilpauk, Chennai', 13.043, 80.2337, 'Mon-Sun 09:00-21:00', '+919876500005', 4.1, TRUE);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (4, 'White Bread', 40, 77);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (4, 'Brown Bread', 50, 20);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (4, 'Cupcakes (6pc)', 150, 33);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (4, 'Cookies 200g', 60, 79);
INSERT INTO users (id, name, email, password, phone, role) VALUES (6, 'Karthik Store', 'karthik.grocery@shopspot.demo', '$2b$12$55aLJZO2QMygtZiWYMTuOO3JozxkNvw9I2x2MZJNuVvi8QZI4QTWe', '+919876500006', 'SELLER');
INSERT INTO shops (id, owner_id, name, category, address, latitude, longitude, opening_hours, phone, rating, is_open_now) VALUES (5, 6, 'Ram Kirana Store', 'Grocery', 'Thoraipakkam, Chennai', 12.9203, 80.2277, 'Mon-Sun 09:00-21:00', '+919876500006', 4.8, TRUE);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (5, 'Rice 5kg', 320, 78);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (5, 'Toor Dal 1kg', 140, 79);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (5, 'Sunflower Oil 1L', 165, 55);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (5, 'Milk 500ml', 28, 11);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (5, 'Sugar 1kg', 45, 33);
INSERT INTO products (shop_id, name, price, stock_qty) VALUES (5, 'Bread', 40, 10);