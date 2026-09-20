# Siva Mart

Siva Mart is a complete beginner-friendly grocery shopping website. It is an original design inspired by familiar online-store patterns; it does not copy Amazon's brand, logo, images, or code.

## What you can do

- Browse grocery products and filter by department.
- Search products by name or description.
- Add items to a cart; the cart stays after a browser refresh.
- Create an account or sign in securely.
- Place an order; the server validates stock and reduces inventory.

## Recommended tools

Use **VS Code and Docker together**.

- **VS Code** is where you read, edit, and debug the code.
- **Docker Desktop** starts the app and PostgreSQL database consistently.
- **PostgreSQL** is the recommended database for Siva Mart. Products, customers, orders, stock, and order items are relational data. Firebase is better for prototypes or real-time messaging, not the primary database for this shop.

## Project structure

```text
siva-mart/
|- public/                 Frontend shown in the browser
|  |- index.html           Page structure
|  |- styles.css           Responsive visual design
|  `- app.js               Browser behaviour and API requests
|- database/
|  `- init.sql             Tables and sample grocery products
|- server.js               Express backend and API routes
|- package.json            Node.js dependencies and commands
|- Dockerfile              Instructions for building the app container
|- docker-compose.yml      Starts the app and PostgreSQL together
|- .env.example            Safe configuration template
`- README.md               This guide
```

## Start the project in VS Code

1. Install [VS Code](https://code.visualstudio.com/) and [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Start Docker Desktop and wait until it says Docker is running.
3. In VS Code, choose **File -> Open Folder** and select the `build-x20-3` folder.
4. Copy `.env.example` and rename the copy to `.env`.
5. In `.env`, replace `JWT_SECRET` with a long private sentence. Never share or commit this file.
6. Open **Terminal -> New Terminal** in VS Code.
7. Run `docker compose up --build`.
8. Open `http://localhost:3000` in your browser.
9. Stop the project with `Ctrl+C`, then run `docker compose down`.

## How the frontend connects to the backend

```text
index.html + app.js
       |  fetch('/api/products')
       v
server.js (Express API)
       |  SQL query through pg library
       v
PostgreSQL database
       |  JSON response
       v
app.js creates product cards in the browser
```

The frontend and backend use the same address (`localhost:3000`), so no CORS setup is required for local development.

## API reference

| Method | Endpoint | What it does |
| --- | --- | --- |
| GET | `/api/products` | Lists products. Optional `search` and `category` filters. |
| GET | `/api/categories` | Lists available departments. |
| POST | `/api/auth/register` | Creates a user with a hashed password. |
| POST | `/api/auth/login` | Verifies a password and returns a login token. |
| POST | `/api/orders` | Creates an order and deducts stock. Requires login. |
| GET | `/api/orders/me` | Returns orders for the logged-in user. |

## Understand the code

### Frontend

`public/index.html` creates the header, search form, hero section, product section, cart drawer, and login dialog. It has no product cards written by hand because `app.js` receives them from the backend.

`public/styles.css` defines reusable color variables first, then header, hero, product-card, cart, dialog, and phone-screen rules. The final `@media` section makes the layout compact for a mobile screen.

`public/app.js` has one responsibility per function:

| Function | Meaning |
| --- | --- |
| `api` | Sends a request and converts a response to JSON. |
| `loadProducts` | Requests product data from the backend. |
| `renderProducts` | Converts product data into visible product cards. |
| `addToCart`, `changeQuantity` | Update the browser cart and save it in `localStorage`. |
| `renderCart` | Shows the cart count, items, quantities, and total. |
| `checkout` | Sends selected products to the protected order API. |

### Backend

`server.js` uses Express routes. The `/api/products` query uses `$1` and `$2` placeholders, which protect the database from SQL injection. Passwords are hashed by `bcryptjs`; the original password is never stored. `requireUser` verifies the signed login token before allowing an order. The order route uses `BEGIN`, `COMMIT`, and `ROLLBACK`, which means every stock update succeeds together or none of it is saved.

`database/init.sql` creates five related tables: `users`, `categories`, `products`, `orders`, and `order_items`. The `INSERT` statements add test groceries so the page is useful immediately.

## Verification checklist

After starting the project, test these in order:

1. Open the home page and confirm all eight products load.
2. Search for `milk`; the milk card should remain.
3. Select a category, then return to All departments.
4. Add an item, refresh the page, and confirm the cart is still present.
5. Create an account using a new email address.
6. Add an item and click Checkout; confirm the success message appears.
7. Refresh and confirm that stock is lower after a successful order.

## Important limitations before real deployment

This is a strong capstone/demo foundation, not a live payment system. Before publishing it, add HTTPS, a real payment provider, email verification, rate limiting, administrator roles, automated tests, image storage, validation rules, error monitoring, backups, and a production database password.
