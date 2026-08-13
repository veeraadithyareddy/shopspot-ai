"""
Generates shops_seed.sql for the ShopSpot marketplace app:
- demo user accounts (sellers + one consumer), password for all = password123
- shops owned by those sellers, with real Chennai coordinates
- products with stock for each shop

Run with: python3 generate_sample_seed.py
"""

import random

random.seed(7)

# Pre-computed BCrypt hash for the password "password123"
DEMO_PASSWORD_HASH = "$2b$12$55aLJZO2QMygtZiWYMTuOO3JozxkNvw9I2x2MZJNuVvi8QZI4QTWe"

# (seller_name, email, shop_name, category, lat, lng, address)
SELLERS = [
    ("Ravi Kumar", "ravi.grocery@shopspot.demo", "Nilgiris Supermarket", "Grocery", 13.0067, 80.2206, "T. Nagar, Chennai"),
    ("Meena Shop", "meena.veg@shopspot.demo", "Fresh Mart Vegetables", "Vegetables & Fruits", 12.9010, 80.2279, "Sholinganallur, Chennai"),
    ("Suresh Pharma", "suresh.pharma@shopspot.demo", "Apollo Pharmacy", "Pharmacy", 13.0067, 80.2210, "T. Nagar, Chennai"),
    ("Anitha Bakes", "anitha.bakery@shopspot.demo", "Hot Chips Bakery", "Bakery", 13.0430, 80.2337, "Kilpauk, Chennai"),
    ("Karthik Store", "karthik.grocery@shopspot.demo", "Ram Kirana Store", "Grocery", 12.9203, 80.2277, "Thoraipakkam, Chennai"),
]

PRODUCT_POOL = {
    "Grocery": [("Rice 5kg", 320), ("Toor Dal 1kg", 140), ("Sunflower Oil 1L", 165), ("Milk 500ml", 28), ("Sugar 1kg", 45), ("Bread", 40)],
    "Vegetables & Fruits": [("Tomato 1kg", 30), ("Onion 1kg", 35), ("Potato 1kg", 25), ("Banana (dozen)", 50), ("Apple 1kg", 180)],
    "Pharmacy": [("Paracetamol strip", 20), ("Vitamin C Tablets", 90), ("Hand Sanitizer 200ml", 75), ("Bandages", 35)],
    "Bakery": [("White Bread", 40), ("Brown Bread", 50), ("Cupcakes (6pc)", 150), ("Cookies 200g", 60)],
}

lines = []
lines.append("-- ShopSpot marketplace seed data")
lines.append("-- All demo accounts use password: password123")
lines.append("USE shopspot;\n")

lines.append("""
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
""")

# Demo consumer account
lines.append(
    f"INSERT INTO users (id, name, email, password, phone, role) VALUES "
    f"(1, 'Demo Consumer', 'consumer@shopspot.demo', '{DEMO_PASSWORD_HASH}', '+919876500000', 'CONSUMER');"
)

user_id = 2
shop_id = 1
for name, email, shop_name, category, lat, lng, address in SELLERS:
    lines.append(
        f"INSERT INTO users (id, name, email, password, phone, role) VALUES "
        f"({user_id}, '{name}', '{email}', '{DEMO_PASSWORD_HASH}', '+9198765{user_id:05d}', 'SELLER');"
    )
    rating = round(random.uniform(3.5, 4.9), 1)
    lines.append(
        f"INSERT INTO shops (id, owner_id, name, category, address, latitude, longitude, "
        f"opening_hours, phone, rating, is_open_now) VALUES "
        f"({shop_id}, {user_id}, '{shop_name}', '{category}', '{address}', {lat}, {lng}, "
        f"'Mon-Sun 09:00-21:00', '+9198765{user_id:05d}', {rating}, TRUE);"
    )

    for pname, price in PRODUCT_POOL.get(category, []):
        stock = random.randint(5, 80)
        lines.append(
            f"INSERT INTO products (shop_id, name, price, stock_qty) VALUES "
            f"({shop_id}, '{pname}', {price}, {stock});"
        )

    user_id += 1
    shop_id += 1

with open("shops_seed.sql", "w") as f:
    f.write("\n".join(lines))

print(f"Wrote shops_seed.sql with {len(SELLERS)} sellers/shops + 1 demo consumer.")
print("All demo logins use password: password123")
for name, email, shop_name, *_ in SELLERS:
    print(f"  Seller: {email}  (shop: {shop_name})")
print("  Consumer: consumer@shopspot.demo")
