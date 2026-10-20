# Supermarket Point of Sale (POS) & Inventory System

A complete, production-ready, full-stack Supermarket Point of Sale (POS) and inventory management application designed for school project demonstration and commercial readiness. Built with **React (Vite)**, **Node.js (Express)**, **PostgreSQL (Neon)**, and **Prisma ORM**.

---

## 1. Project Overview & Features

### Core Modules
- **Point of Sale (POS) Checkout:**
  - Fast barcode scanning (supports hardware USB/Bluetooth barcode readers and manual typing).
  - Search products by name, SKU, or barcode aliases.
  - Multi-item shopping cart with line totals, quantity controls, and custom discounts.
  - Authoritative backend price and stock validation (never trusts client-calculated totals).
  - Idempotency key protection to prevent accidental duplicate checkout submissions.
  - Dual-currency display and calculations: **US Dollar (USD)** and **Cambodian Riel (KHR)**.
- **Payment Processing:**
  - **Cash Payments:** Real-time change calculation, insufficiency protection, cash-in-drawer tracking.
  - **Demonstration QR / E-Wallet Payments:** Generates sample KHQR/E-wallet codes with transaction references. Transactions remain in `PENDING` state with stock reserved until an authorized user verifies and confirms receipt in the merchant payment portal. Includes cancellation and stock reservation release.
- **Traceable Inventory & FEFO Batch Tracking:**
  - **First Expired, First Out (FEFO):** Sales automatically allocate stock from the earliest expiring available batch.
  - Expiry date enforcement: Expired batches are automatically blocked from being sold.
  - Batch tracking with lot numbers, unit costs, received dates, and expiry dates.
  - Expiry warning thresholds and expired write-off workflows.
  - Traceable stock movements audit trail (`OPENING_STOCK`, `RECEIPT`, `SALE`, `ADJUSTMENT_ADD`, `ADJUSTMENT_SUBTRACT`, `RETURN_RESTOCK`, `WRITE_OFF_EXPIRED`, `WRITE_OFF_DAMAGED`).
- **Suppliers & Purchasing:**
  - Supplier directory with contact details and order histories.
  - Purchase Orders lifecycle: `Draft → Submitted → Approved → Partially Received → Fully Received`.
  - Goods Receiving (GRN): Records received quantities against approved purchase orders, assigns lot numbers and expiry dates, and updates inventory atomically.
- **Receipts, Sales History & Returns:**
  - Printable supermarket receipt matching 80mm thermal receipt formats with store header, itemized breakdown, tax, and return policy.
  - Sales history search and date range filtering.
  - Authorized refund/return workflow with explicit restocking decision (only returns to inventory if condition is marked "Good").
- **Cashier Shifts & Cash Management:**
  - Cashier opening float registration.
  - Mid-shift cash-in and cash-out movements with audit reasons.
  - End-of-shift cash drawer count with automated reconciliation (expected vs actual difference).
- **Reports & Analytics:**
  - Daily, weekly, and monthly sales volume and revenue.
  - Cost of Goods Sold (COGS) and estimated gross profit calculated from historical batch cost snapshots.
  - Payment method distribution (Cash vs QR).
  - Cashier sales performance.
  - Inventory asset valuation at cost and potential retail revenue.
  - Safe CSV export with spreadsheet formula-injection protection (`=`, `+`, `-`, `@` escaped).
- **Multi-Role Security & Audit Logs:**
  - Role-Based Access Control (RBAC): `OWNER`, `ADMIN`, `CASHIER`, `INVENTORY_MANAGER`.
  - Passwords hashed with bcrypt (salt rounds: 12).
  - JWT session tokens and secure cookies.
  - Rate limiting on authentication and checkout endpoints to prevent brute force.
  - Immutable, read-only system audit logs recording actors, actions, timestamps, and contextual diffs.
  - One-time owner setup procedure protected by a secret key.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6 | High-performance SPA with modern UI |
| **Routing** | React Router v6 | Client-side routing with role-based route guards |
| **Icons & Styling** | Lucide React, Modern CSS | Clean responsive layout (desktop & tablet friendly) |
| **HTTP Client** | Axios | Configured with token interceptors and 401 handlers |
| **Backend** | Node.js (v20+), Express.js | Modular RESTful API architecture |
| **ORM & Database** | Prisma ORM, PostgreSQL (Neon) | Relational database with foreign keys, indexes, and transactions |
| **Security** | Helmet, CORS, Express-Rate-Limit, Zod | Input validation, HTTP headers, rate limiting |
| **Authentication** | JSON Web Tokens (JWT), Bcrypt.js | Password hashing and session authorization |
| **Testing** | Node.js Test Runner (`node:test`) | Fast, native unit and validation testing |

---

## 3. Project Structure (Monorepo)

```text
supermarket-pos/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database models, relations & indexes
│   │   └── seed.js              # Initial settings, categories, and demo products
│   ├── src/
│   │   ├── config/              # Database client, constants & environment
│   │   ├── middleware/          # JWT auth, role guards, error handler, rate limiter
│   │   ├── modules/             # Auth, products, pos, inventory, purchasing, shifts, etc.
│   │   ├── routes/              # Central API router
│   │   ├── services/            # Audit logging & business services
│   │   ├── utils/               # Money calculations, response envelopes
│   │   ├── validators/          # Zod schema validation
│   │   └── app.js               # Express application entry point
│   ├── tests/                   # Automated unit & schema tests
│   ├── .env.example             # Backend environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios client with interceptors
│   │   ├── components/          # Reusable Modals, TopBar, Sidebar, Receipt template
│   │   ├── context/             # AuthContext (session & roles), PosContext (cart & totals)
│   │   ├── pages/               # POS Checkout, Dashboard, Products, Inventory, Shifts, etc.
│   │   ├── styles/              # CSS variables, responsive tables, printable receipt
│   │   ├── App.jsx              # Application router with route guards
│   │   └── main.jsx             # React entry point
│   ├── .env.example             # Frontend environment template
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore                   # Guards secrets, builds, and node_modules
├── README.md                    # Documentation & setup guide
└── package.json                 # Monorepo workspace runner
```

---

## 4. Local Setup & Installation

### Prerequisites
1. **Node.js** (v20 or higher recommended)
2. **Git**
3. A **Neon PostgreSQL** database project (free at [neon.tech](https://neon.tech))

> [!NOTE]
> On Windows, if running `npm` produces a script execution policy error in PowerShell (`npm.ps1 cannot be loaded`), either use `npm.cmd` in your terminal commands or run PowerShell with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

### Step 1: Install Dependencies
From the project root:
```bash
# Using standard npm (or npm.cmd on Windows)
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

---

## 5. Neon PostgreSQL Database Configuration

### 1. Where to Get Your Neon Connection String
1. Log in to [Neon Console](https://console.neon.tech).
2. Select your project.
3. On the **Dashboard**, locate the **Connection Details** box.
4. Select **Prisma** or **PostgreSQL** connection string.
5. Choose **Pooled connection** for `DATABASE_URL` (recommended for serverless environments) or **Direct connection** for migrations (`DIRECT_URL`).
   The connection string looks like:
   ```text
   postgresql://username:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Configure Backend Environment
Create `backend/.env` (this file is excluded from Git by `.gitignore` to keep credentials safe):
```bash
# In backend/.env
PORT=5000
NODE_ENV=development

# Paste your Neon PostgreSQL connection string here (must include ?sslmode=require):
DATABASE_URL="postgresql://username:password@ep-your-db-host.neon.tech/neondb?sslmode=require"

# Strong secret for signing session tokens:
JWT_SECRET="super-secret-random-key-at-least-32-chars-long"
JWT_EXPIRES_IN="12h"

# Local frontend URL for CORS:
CLIENT_URL="http://localhost:5173"

# Secret key used during the one-time owner initialization:
SETUP_SECRET="pos-setup-secret-key"
```

### 3. Run Prisma Migrations & Seed Data
From the `backend` directory:
```bash
# Push schema to your Neon database
npm run prisma:migrate -- --name init

# Or deploy schema directly:
npx prisma db push

# Seed initial store settings, default categories, suppliers, and demo products with barcodes:
npm run prisma:seed
```

---

## 6. Running the Application Locally

You can run both the frontend and backend concurrently from the root directory:
```bash
npm run dev
```

Or run them individually in separate terminals:
- **Backend API:**
  ```bash
  cd backend
  npm run dev
  # Server listens at http://localhost:5000
  # Health check: http://localhost:5000/api/health
  ```
- **Frontend App:**
  ```bash
  cd frontend
  npm run dev
  # Vite dev server runs at http://localhost:5173
  ```

---

## 7. Initial Owner Setup & Multi-Role Demonstration

### First Time Setup:
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. If no owner account exists yet, the system shows an initialization notice.
3. Click **Initialize Owner Account** (or visit `http://localhost:5173/setup`).
4. Enter:
   - **Full Name:** `System Owner`
   - **Username:** `owner`
   - **Password:** `OwnerPassword123!`
   - **Setup Secret Key:** `pos-setup-secret-key` (matches `SETUP_SECRET` in `backend/.env`)
5. Click **Initialize Owner Account**. Once submitted, the `/setup` wizard locks permanently to prevent unauthorized re-initialization.

### Role Permissions Matrix:
| Role | POS & Checkout | Shifts & Cash | Products & Batches | PO & Receiving | Reports & Profit | User Admin | System Settings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **OWNER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **INVENTORY_MANAGER** | ❌ | ❌ | ✅ | ✅ | ✅ (Stock) | ❌ | ❌ |
| **CASHIER** | ✅ | ✅ (Own) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 8. Running Automated Tests

Run backend tests using Node's native test runner:
```bash
cd backend
npm test
```
This tests:
- Money rounding and precision without floating-point representation drift.
- Line total, discounts, and USD/KHR exchange rate conversions.
- Zod schema validations for setup, login, POS checkout, and refunds.
- Idempotency key and payment method integrity.

---

## 9. Render Deployment Guide

Deploying the system to [Render](https://render.com) for production:

### 1. Backend Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository: `https://github.com/zersleep/supermarket-pos`.
3. Configure the service settings:
   - **Name:** `supermarket-pos-api`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `node src/app.js`
4. Set Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (or leave default supplied by Render)
   - `DATABASE_URL`: Your pooled Neon connection string (`postgresql://...?sslmode=require`)
   - `JWT_SECRET`: A long, randomly generated secret string
   - `CLIENT_URL`: The URL of your deployed frontend (e.g. `https://supermarket-pos.onrender.com`)
   - `SETUP_SECRET`: Your private one-time owner setup key
5. Under **Health Check Path**, enter: `/api/health`.
6. Deploy the Web Service.

### 2. Frontend Static Site
1. In Render Dashboard, click **New +** → **Static Site**.
2. Connect your GitHub repository.
3. Configure the static site settings:
   - **Name:** `supermarket-pos-web`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Set Environment Variables:
   - `VITE_API_BASE_URL`: `https://supermarket-pos-api.onrender.com/api` (your deployed Render backend URL)
5. Under **Redirects/Rewrites**:
   - Add a rewrite rule for Single Page Application (SPA) routing:
     - **Source:** `/*`
     - **Destination:** `/index.html`
     - **Action:** `Rewrite`
6. Deploy the Static Site.

> [!WARNING]
> **Render Free Plan Limitations:**
> Free Web Services on Render automatically spin down after 15 minutes of inactivity. When a new request arrives, it may experience a 30–50 second cold start delay. For a school presentation, visit the backend health check URL 2 minutes beforehand to ensure the service is awake.

---

## 10. Important Security Notes & Disclaimers

1. **Demonstration QR Payments:**
   The QR code generated in the checkout interface is a clearly labeled **demonstration workflow**. A displayed QR code is not automatic proof of payment. Authorized cashiers or managers must verify incoming funds in their official bank/merchant application before clicking **Confirm Payment**.
2. **Secrets Protection:**
   Never commit `.env` files or paste database credentials into public chats or source repositories. All database credentials reside strictly within the backend environment.
3. **No Cascading Deletion of Financial Data:**
   Completed sales, historical snapshots, payments, and audit logs are permanent records and cannot be silently erased.
