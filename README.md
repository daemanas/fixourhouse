# FixOurHouse — Local Services Marketplace

FixOurHouse (also referred to in parts of the codebase as **LocalFix**) is a full-stack service marketplace that connects customers with local service providers. Customers can discover services and providers, place and manage bookings, and leave reviews or complaints. Providers can manage their business profile, services, availability, jobs, earnings, withdrawals, and customer feedback. Administrators have a separate dashboard for marketplace operations, moderation, analytics, commissions, and website configuration.

> **Repository note:** The application code and API messages use the `LocalFix` name in several places, while this repository is named `fixourhouse`. This README uses **FixOurHouse** as the project name and **LocalFix** where it reflects an implementation detail.

---

## Contents

- [Product overview](#product-overview)
- [User roles](#user-roles)
- [Feature overview](#feature-overview)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Running the application](#running-the-application)
- [API overview](#api-overview)
- [Authentication and authorization](#authentication-and-authorization)
- [Database models](#database-models)
- [Location data import](#location-data-import)
- [Testing and quality checks](#testing-and-quality-checks)
- [Deployment notes](#deployment-notes)
- [Known limitations and follow-up work](#known-limitations-and-follow-up-work)
- [Security guidance](#security-guidance)
- [Contributing](#contributing)

## Product overview

FixOurHouse is designed as a multi-role marketplace rather than a simple service listing website. It has three main application experiences:

1. **Customer marketplace** — browse the service catalog, search for providers, view provider profiles, and manage bookings.
2. **Provider workspace** — maintain a provider profile and service catalog, configure availability, respond to booking requests, complete jobs, and review earnings.
3. **Admin console** — oversee customers, providers, bookings, complaints, reviews, reports, commissions, revenue, and website settings.

The frontend is a React single-page application. It communicates with a versioned Express REST API, which persists application data in MongoDB through Mongoose.

## User roles

| Role | Main responsibilities |
|---|---|
| Customer | Discover services/providers, manage profile and wishlist, book services, track bookings, receive notifications, and raise complaints/reviews. |
| Provider | Manage business profile, offered services, gallery, availability, booking requests, jobs, reviews, earnings, and withdrawal requests. |
| Admin | Manage marketplace users and providers, review bookings and complaints, moderate reviews/reports, configure service catalog and commissions, and view analytics/revenue. |

Admin authentication is intentionally separate from customer/provider authentication. Admin credentials are configured on the server and should never be exposed in frontend environment variables.

## Feature overview

### Customer experience

- Customer registration, login, OTP verification, and password recovery.
- Google sign-in integration (requires OAuth client configuration).
- Service catalog and category browsing.
- Service detail and provider profile pages.
- Search and provider discovery, including a protected nearby-provider endpoint.
- Booking creation and booking history/details.
- Wishlist, profile, account settings, and notifications.
- Complaint submission and review-related backend modules.
- Public information pages: About, Contact, Privacy, Terms, Refund, Cancellation, Cookie Policy, and Report Abuse.

### Provider experience

- Provider registration with a corresponding provider profile record.
- Provider dashboard and booking request management.
- Job management and booking status updates.
- Provider profile and account settings.
- Service creation, editing, and deletion, including image upload support.
- Availability management.
- Provider gallery and completed-service photos.
- Reviews and complaint responses.
- Earnings overview and withdrawal workflows.

### Admin experience

- Dedicated admin login and protected admin session.
- Analytics dashboard and marketplace KPIs.
- Customer/user and provider listing/detail views.
- Provider and customer administration.
- Booking management.
- Service catalog, categories, and service types.
- Complaint and review moderation.
- Reports and revenue views.
- Provider commission configuration.
- Website settings.

The actual availability of each action depends on its API implementation, account permissions, and runtime configuration.

## Technology stack

### Frontend (`client/`)

- React 19
- Vite 6
- React Router 7
- Axios
- Tailwind CSS 3
- Framer Motion
- React Hook Form
- Lucide React
- React Hot Toast

### Backend (`server/`)

- Node.js (ES modules)
- Express 4
- MongoDB with Mongoose 8
- JWT authentication (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Joi request validation
- Helmet, CORS, compression
- MongoDB query sanitization and XSS cleaning
- Express rate limiting
- Multer file uploads
- Nodemailer email integration
- Google OAuth token verification (`google-auth-library`)
- Twilio integration configuration for OTP SMS

## Repository structure

```text
fixourhouse-main/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/       # Shared, customer, provider and admin UI
│   │   ├── config/           # Frontend environment configuration
│   │   ├── context/          # Auth, admin auth, notifications, theme, settings
│   │   ├── layouts/          # Public, auth, customer, provider and admin layouts
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── customer/
│   │   │   ├── provider/
│   │   │   └── public/
│   │   ├── services/         # Axios/API service modules
│   │   ├── App.jsx           # Application routes
│   │   ├── main.jsx          # React entry point
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── scripts/              # Location import and utility scripts
│   ├── src/
│   │   ├── config/           # DB, environment, rate limiter configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middlewares/      # Auth, validation, uploads, errors, etc.
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # REST API route definitions
│   │   ├── services/         # Email and supporting services
│   │   ├── utils/
│   │   ├── validators/       # Joi schemas
│   │   ├── app.js            # Express app and middleware registration
│   │   ├── server.js         # DB connection and HTTP startup
│   │   └── seed.js           # Initial seed data
│   ├── .env.example
│   └── package.json
│
└── AUTH_AUDIT_REPORT.md      # Authentication audit and regression-test notes
```

## Architecture

```text
Browser
  │
  ▼
React + Vite application (client)
  │  Axios requests to /api/v1
  ▼
Express application (server)
  ├── Security middleware (Helmet, CORS, sanitization)
  ├── Rate limiting and request validation
  ├── Authentication / role authorization
  ├── Route → Controller → Service / Model
  ▼
MongoDB
```

- The backend health endpoint is `GET /health`.
- API routes are mounted below `/api/v1`.
- Uploaded public assets are served from `/uploads`.
- The frontend API base URL should include the `/api/v1` suffix.

## Getting started

### Prerequisites

Install the following before starting:

- Node.js 20 LTS or another version supported by your deployment environment.
- npm (bundled with Node.js).
- MongoDB local instance or a MongoDB Atlas connection string.
- Git (optional, for cloning).

Check your versions:

```bash
node --version
npm --version
```

### 1. Get the project

```bash
git clone <your-repository-url>
cd fixourhouse-main
```

If you downloaded the source ZIP, extract it and open a terminal in the extracted project directory.

### 2. Configure the backend

```bash
cd server
npm install
```

Create the environment file from the example:

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Edit `server/.env`. At minimum, configure:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/localfix
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-admin-password
CLIENT_URL=http://localhost:5173
```

Make sure MongoDB is running before starting the API.

### 3. Configure the frontend

Open a second terminal:

```bash
cd client
npm install
```

Create the frontend environment file:

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Set the API URL:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_GOOGLE_CLIENT_ID=
```

Do not put server secrets, database credentials, JWT secrets, or admin passwords in `client/.env`. Vite exposes variables prefixed with `VITE_` to browser code.

### 4. Seed initial data (if needed)

From the `server/` directory:

```bash
npm run seed
```

Review `server/src/seed.js` before running it against a database that already contains data. The seed script is for initial/default application data; it is not a production data-reset command.

### 5. Start the backend and frontend

Backend terminal:

```bash
cd server
npm run dev
```

Frontend terminal:

```bash
cd client
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

Verify the backend is running:

```text
http://localhost:5000/health
```

A successful health response includes `success: true`, a status message, the current environment, and a timestamp.

## Environment variables

### Backend

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | HTTP server port (defaults to `5000`) | No |
| `NODE_ENV` | Runtime environment | Recommended |
| `MONGODB_URI` | MongoDB connection string | Yes in production |
| `LOCATION_IMPORT_EXPECTED_DB` | Expected DB name guard for location import | For location import |
| `JWT_SECRET` | Secret for regular JWT signing | Yes in production |
| `JWT_EXPIRES_IN` | Regular JWT lifetime (default `7d`) | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime setting | No |
| `ADMIN_EMAIL` | Server-side admin login email | Yes in production |
| `ADMIN_PASSWORD` | Server-side admin login password | Yes in production |
| `CLIENT_URL` | Allowed frontend origin for CORS | Yes in production |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in milliseconds | No |
| `RATE_LIMIT_MAX` | General API requests per window | No |
| `GOOGLE_CLIENT_ID` | Google Identity Services web client ID | Optional; Google sign-in |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Optional; SMS OTP |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Optional; SMS OTP |
| `TWILIO_PHONE_NUMBER` | Twilio sender number in E.164 format | Optional; SMS OTP |
| `SMTP_HOST` | SMTP server hostname | Optional; email |
| `SMTP_PORT` | SMTP server port | Optional; email |
| `SMTP_SECURE` | Whether SMTP uses TLS directly | Optional; email |
| `SMTP_USER` | SMTP username | Optional; email |
| `SMTP_PASS` | SMTP password/app password | Optional; email |
| `SMTP_FROM` | Sender address | Optional; email |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Full API base URL, including `/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | Google web client ID used by the browser |

Only configure integrations that you intend to use. Keep real `.env` files out of version control.

## Running the application

### Available scripts

**Client (`client/`)**

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Create production frontend build in `client/dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

**Server (`server/`)**

| Command | Description |
|---|---|
| `npm run dev` | Start API with Nodemon |
| `npm start` | Start API with Node.js |
| `npm run seed` | Run initial seed script |
| `npm run import:locations` | Import location reference data |
| `npm run migrate:availability` | Run availability migration script |

There is no root-level npm workspace script in the inspected project. Install dependencies and run commands separately in `client/` and `server/`.

## API overview

Base URL:

```text
http://localhost:5000/api/v1
```

The route modules are mounted under these prefixes:

| Prefix | Purpose |
|---|---|
| `/auth` | Registration, login, OTP, Google auth, password recovery, current user |
| `/users` | User profile and account operations |
| `/providers` | Provider discovery, profiles, services, availability, stats, earnings |
| `/services` | Service catalog and service operations |
| `/service-types` | Service type catalog |
| `/categories` | Service categories |
| `/bookings` | Booking creation, retrieval, and status updates |
| `/reviews` | Reviews and ratings |
| `/reports` | Reports and abuse-related workflows |
| `/notifications` | User notifications |
| `/withdrawals` | Provider withdrawal requests and administration |
| `/provider/gallery` | Provider gallery management |
| `/completed-photos` | Completed-service photo records |
| `/admin` | Admin authentication and administrative APIs |
| `/complaints` | Customer/provider complaint workflows |
| `/locations` | Location reference data and location endpoints |
| `/settings` | Public/application settings |

### Example requests

Register (the exact required fields are defined by the Joi validator):

```http
POST /api/v1/auth/register
Content-Type: application/json
```

Login:

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Get current authenticated user:

```http
GET /api/v1/auth/me
Authorization: Bearer <access-token>
```

Create a customer booking:

```http
POST /api/v1/bookings
Authorization: Bearer <customer-access-token>
Content-Type: application/json
```

Provider profile and service endpoints include:

```text
GET    /api/v1/providers/me/profile
PATCH  /api/v1/providers/me/profile
POST   /api/v1/providers/me/services
PATCH  /api/v1/providers/me/services/:serviceId
DELETE /api/v1/providers/me/services/:serviceId
GET    /api/v1/providers/me/availability
PATCH  /api/v1/providers/me/availability
GET    /api/v1/providers/me/earnings
```

These examples show route locations, not complete request schemas. Refer to the corresponding files in `server/src/validators/` and `server/src/controllers/` for required payload fields, response structures, and permission rules.

## Authentication and authorization

- Customer/provider accounts use the regular authentication flow and role-based authorization.
- Passwords are hashed with `bcryptjs`; JWTs are used for authenticated API access.
- OTP endpoints support registration/login and password-recovery flows.
- Google authentication is available when the matching client ID is configured.
- Provider registration creates a provider profile in addition to the user account.
- Admin sign-in is handled by a dedicated admin authentication endpoint and server-only `ADMIN_EMAIL` / `ADMIN_PASSWORD` configuration.
- Admin sessions use a separate token/session mechanism; admin tokens and regular user tokens are not interchangeable.
- Protected API routes use authentication and role checks. Do not rely only on hiding frontend pages for access control.

For the documented authentication fixes and test notes, see [`AUTH_AUDIT_REPORT.md`](./AUTH_AUDIT_REPORT.md).

## Database models

The backend includes the following Mongoose model modules:

| Model | Responsibility (inferred from model name and application usage) |
|---|---|
| `User` | Customer/provider user account data |
| `Provider` | Provider business profile, verification and provider-specific data |
| `Service` | Provider service listings |
| `Category` | Service categories |
| `ServiceType` | Service type taxonomy |
| `Booking` | Customer-provider service bookings |
| `Payment` | Payment-related records |
| `Review` | Customer reviews and ratings |
| `Complaint` | Customer/provider complaint records |
| `ComplaintCounter` | Complaint numbering/counter support |
| `Report` | User-submitted reports |
| `Notification` | User notifications |
| `Gallery` | Provider portfolio/gallery items |
| `CompletedServicePhoto` | Photos associated with completed services |
| `Withdrawal` | Provider withdrawal requests |
| `CommissionSettings` | Platform commission configuration |
| `CommissionOffer` | Commission offer/override records |
| `WebsiteSettings` | Website/application settings |
| `Location` | Location reference records |
| `AuthOtp` | OTP verification records |
| `AdminSession` | Admin session and revocation records |

For exact fields, indexes, validation rules, and relationships, inspect the corresponding schema in `server/src/models/`.

## Location data import

The repository includes `server/scripts/importLocations.js` and an npm script:

```bash
cd server
npm run import:locations
```

The backend environment example includes `LOCATION_IMPORT_EXPECTED_DB` as a safety check. Set it to the intended database name and verify `MONGODB_URI` before importing. Do not run imports against production without reviewing the script and backing up the target database.

## Testing and quality checks

Frontend:

```bash
cd client
npm run lint
npm run build
```

Backend tests and supporting scripts are present in the repository, including controller tests and utility scripts. Review the actual test files and run them with the test runner/configuration available in the current checkout; the backend `package.json` does not define a general `test` script.

The authentication audit document reports **32 passing end-to-end authentication checks** at the time that report was written. Treat that as a recorded audit result, not as proof that every current build or every application feature has been tested.

## Deployment notes

The project can be deployed as two services:

1. **Backend service** — deploy the `server/` application using `npm install` and `npm start`.
2. **Frontend static site** — build `client/` using `npm install` and `npm run build`, then publish `client/dist/`.

Configure the following in the deployment platform:

- Backend `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLIENT_URL`, and `NODE_ENV=production`.
- Optional SMTP, Twilio, and Google OAuth variables when those integrations are enabled.
- Frontend `VITE_API_URL` pointing to the deployed backend API and ending in `/api/v1`.
- Frontend `VITE_GOOGLE_CLIENT_ID` when Google sign-in is enabled.
- CORS `CLIENT_URL` must exactly match the deployed frontend origin.
- Ensure the backend can persist uploaded files, or move uploads to durable object storage before using ephemeral hosting.
- Configure the frontend host to rewrite application routes to `index.html` so React Router deep links work on refresh.
- Use HTTPS for both services.

Do not copy development secrets into production. Rotate any credentials that may have been exposed.

## Known limitations and follow-up work

The following points are based on the repository's audit notes and route/page inspection. Confirm current behavior before treating them as release blockers or completed work.

- **OTP delivery:** The authentication audit notes that OTP delivery may be logged during development unless a real SMS/email provider is configured. Verify the active delivery path and credentials in the target environment.
- **Admin password recovery:** The audit notes that admin password recovery is not implemented as a self-service flow; operators must manage the configured server-side credential securely.
- **Frontend placeholder routes:** Several customer routes currently render a not-found placeholder (including customer reviews, messages, addresses, and some legacy booking/payment paths). Review `client/src/App.jsx` before advertising those screens as available.
- **Payments:** A `Payment` model exists, but the repository inspection does not establish a complete live payment gateway integration. Verify end-to-end payment behavior before accepting real payments.
- **Uploads in production:** Local upload storage needs durable persistence or object storage on hosts with ephemeral filesystems.
- **Rate limiting:** The audit notes an in-memory rate-limit store; use a shared store such as Redis for multi-instance production deployments.
- **Schema index warnings:** The audit mentions duplicate Mongoose index declarations that should be cleaned up.
- **Automated test command:** The backend package does not expose a standard `npm test` script; establish a consistent test runner and CI workflow.
- **Operational readiness:** Add structured logging, monitoring, backups, deployment health checks, and documented incident/restore procedures before production launch.

## Security guidance

- Never commit `.env` files or credentials.
- Use a unique, high-entropy `JWT_SECRET` in production.
- Use a strong, unique admin password and rotate it if it has ever been shared or committed.
- Keep admin credentials exclusively on the server.
- Restrict CORS to the real frontend origin.
- Use HTTPS in production.
- Validate uploads by type and size, and store user uploads in durable storage with appropriate access controls.
- Review authorization at the API layer for every customer/provider/admin operation.
- Back up MongoDB and test restoration procedures.
- Review Git history for previously committed secrets; deleting a secret from the current working tree does not remove it from old commits.

## Contributing

1. Create a feature branch.
2. Keep frontend API calls inside the existing `client/src/services/` modules.
3. Keep backend request handling separated into routes, controllers, validators, and models.
4. Add or update validation and authorization when introducing endpoints.
5. Run frontend lint/build checks and relevant backend tests.
6. Never include secrets, real user data, or production database dumps in commits.

---

## Project status

This repository contains a substantial multi-role marketplace implementation with customer, provider, and admin areas, a React/Vite frontend, and an Express/MongoDB API. It should be treated as an actively developed application until the outstanding integration, placeholder-route, persistence, and production-readiness items above have been verified.

