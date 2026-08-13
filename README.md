# ShopSpot

Redesigned to match the uploaded UI mockups.

## What changed in this version

- **Consumers no longer need an account.** The public landing page lets anyone
  search for a product by location directly — no login, no signup.
- **Only sellers have accounts** (login/signup with shop details).
- **Seller dashboard** redesigned to match the mockup: shop info card, product
  table with an Available/Out of Stock toggle (plus price and stock quantity,
  which are still tracked), Add/Edit/Delete modals, and an Edit Shop modal
  with structured address fields (Address Line 1, Area/Locality, City, State,
  PIN Code).
- Shop location is geocoded automatically from the typed address (or GPS) —
  no more manually entering latitude/longitude.

```
shopspot/
├── shopspot-backend/    Spring Boot API — JWT auth (sellers only), shop/product management, proximity search
├── shopspot-frontend/   React + Vite — public landing/search, seller auth, seller dashboard
├── dataset_script/      Seed data generator (demo seller accounts + shops + products)
└── .vscode/launch.json  Run/debug config
```

## 1. Set up MySQL

```bash
mysql -u root -p
```
```sql
CREATE DATABASE shopspot;
EXIT;
```

Import the seed data:
```bash
mysql -u root -p shopspot < dataset_script/shops_seed.sql
```

**Demo seller accounts** (all use password `password123`):

| Email | Shop |
|---|---|
| ravi.grocery@shopspot.demo | Nilgiris Supermarket (T. Nagar) |
| meena.veg@shopspot.demo | Fresh Mart Vegetables (Sholinganallur) |
| suresh.pharma@shopspot.demo | Apollo Pharmacy (T. Nagar) |
| anitha.bakery@shopspot.demo | Hot Chips Bakery (Kilpauk) |
| karthik.grocery@shopspot.demo | Ram Kirana Store (Thoraipakkam) |

Consumers don't need an account — just use the search bar on the home page.

## 2. Configure and run the backend

Edit `shopspot-backend/src/main/resources/application.properties` with your
MySQL password, then:
```bash
cd shopspot-backend
mvn spring-boot:run
```
Wait for `Tomcat started on port 8080`.

## 3. Run the frontend

```bash
cd shopspot-frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

## 4. Try it out

**As a shopper:** on the home page, type a location (or click the ⌖ button
to use GPS) and search for a product — e.g. "rice", "tomato", "paracetamol".
Results show nearest-first with directions links, no login needed.

**As a seller:** click "Seller sign in" top right. Log in with a demo
account, or sign up a new one (you'll need to set a shop location via
address lookup or GPS before the account can be created). Manage your
inventory, toggle availability, and edit shop info from the dashboard.

## AI features (Groq)

ShopSpot now has two AI-powered features using Groq's free API:

1. **Smart search** — consumer searches like "something for a headache" or
   "stuff for breakfast" get expanded into concrete product keywords
   automatically (e.g. paracetamol, cough syrup). Falls back to plain
   keyword search if Groq isn't configured, so nothing breaks without it.
2. **AI bulk inventory update** — sellers can type something like
   *"rice is out of stock, dal is now 140, add paneer at 90 rupees with
   10 in stock"* into a box on the dashboard, and it parses that into the
   right add/update actions automatically.

### Setup

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Open `shopspot-backend/src/main/resources/application.properties` and set:
   ```properties
   groq.api.key=your_actual_groq_key_here
   ```
3. Restart the backend. That's it — both features are live immediately.

Without a key set, smart search silently falls back to plain keyword
matching, and the bulk-update box shows a message saying AI isn't
configured yet — nothing crashes.

## Notes

- Geocoding uses OpenStreetMap's free Nominatim service (no API key needed).
  It runs client-side in the browser, so it works regardless of any network
  restrictions on the backend.
- A shop with no location set won't appear in any consumer search — the
  seller dashboard shows a warning banner if this happens.
