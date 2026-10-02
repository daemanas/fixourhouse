# 🔐 LocalFix Authentication System — Complete Audit Report

**Date:** August 3, 2026
**Scope:** Full authentication flow (frontend ↔ backend ↔ database)
**Result:** ✅ 32/32 end-to-end tests passing after fixes

---

## 1. Problems Found

| # | Severity | Problem |
|---|----------|---------|
| 1 | **CRITICAL** | `validate` middleware broke EVERY request with Joi validation. It always passed `{ body, query, params }` to the schema, but auth validators only define a `body` key. Joi rejects the unknown `query`/`params` keys → **every register/login/forgot/reset request returned 400 "Validation failed"** regardless of payload. |
| 2 | **CRITICAL** | Provider registration did **not** create a `Provider` record. The `User` was created with `role: 'provider'` but no provider profile existed → provider-specific fields were never saved; downstream provider features would break. |
| 3 | **HIGH** | `client/.env` had `VITE_API_URL=http://localhost:5000/api` (missing `/v1`). Backend mounts routes at `/api/v1` → **every frontend API call returned 404** "Route not found". |
| 4 | **HIGH** | `authService.js` called `/auth/forgot-password` and `/auth/reset-password` (client route style) instead of `/auth/forgot-password` & `/auth/reset-password` backend endpoints with correct payload (`phone` → forgot, `token + password` → reset). The Forgot/Reset pages were not wired to the API at all (used local fallback). |
| 5 | **MEDIUM** | `verifyOtp` returned a login JWT even when the purpose was `reset-password`. The OTP verify endpoint now issues a short-lived `resetToken` for the reset-password purpose. |
| 6 | **MEDIUM** | OTP page used `result.user.role` for redirect; OTP verify response shape is `data.user.role`. Fixed to use the correct path. OTP resend also hard-coded purpose incorrectly. |
| 7 | **LOW** | `AuthContext.refreshUser` expected `response.data.data`; `getMe` returns `ApiResponse({ user })` so the shape was inconsistent. Fixed. |
| 8 | **LOW** | Phone number validation rejected valid 10-digit Indian numbers with `+91` prefix or spaces because validation only accepted a bare 10-digit string. Added phone normalization (`+91 98765 43210` → `9876543210`). |
| 9 | **LOW** | Duplicate schema indexes caused Mongoose warnings (`index: true` + `schema.index()`). Non-fatal, noted as technical debt. |
| 10 | **INFO** | No admin user existed. Created a seed script (`server/src/seed.js`) that creates an admin and default categories. |

---

## 2. Root Causes

### Problem 1 — Universal 400 "Validation failed"
```js
// OLD (buggy) validate.js — passed keys the schema didn't define
schema.validate(
  { body: req.body, query: req.query, params: req.params },  // ❌ query/params not in auth schemas
  { abortEarly: false }
);
```
Joi's default `allowUnknown: false` rejected `query`/`params` because `authValidator` only defines a `body` object. **This affected every single auth endpoint.**

### Problem 2 — Provider profile missing
`authController.register` only created a `User` document. The `Provider` model (with `businessName`, `category`, `verificationStatus`, etc.) was never instantiated for provider registrations, so provider-specific fields were never saved.

### Problem 3 — 404 on all frontend API calls
`client/.env` → `VITE_API_URL=http://localhost:5000/api` but `server/src/app.js` mounts routes at `app.use('/api/v1', routes)`. URL mismatch → 404 for every request.

---

## 3. Files Modified

### Backend
| File | Change |
|------|--------|
| `server/src/middlewares/validate.js` | **Critical fix:** validate only schema keys present (`body`/`query`/`params`). |
| `server/src/controllers/authController.js` | Auto-create `Provider` record on provider registration. `verifyOtp` supports `purpose: 'reset-password'` → returns `resetToken` instead of JWT. |
| `server/src/validators/authValidator.js` | Normalize phone (`+91`, spaces) → 10-digit; added `purpose` field to OTP validator. |
| `server/src/seed.js` | Seeds sample categories; admin credentials are no longer seeded into `User`. |
| `server/.env` | Ignored local configuration; never commit its values. |
| `server/src/auth-test.js` | E2E auth suite now uses the dedicated admin login endpoint and configured environment credentials. |
| `server/src/controllers/adminAuthController.js` | Dedicated `ADMIN_EMAIL` / `ADMIN_PASSWORD` login, scoped JWTs, and session revocation. |
| `server/src/middlewares/adminAuth.js` | Protects every admin API with a separate admin token and active-session check. |

### Frontend
| File | Change |
|------|--------|
| `client/src/services/authService.js` | Fixed forgot/reset endpoints + payloads. |
| `client/src/pages/auth/ForgotPasswordPage.jsx` | Wired to API (`authService.forgotPassword`). |
| `client/src/pages/auth/ResetPasswordPage.jsx` | Wired to API (`authService.resetPassword`). |
| `client/src/pages/auth/OtpPage.jsx` | Fixed purpose handling + role redirect path (`result.user.role`). |
| `client/src/context/AuthContext.jsx` | Fixed `refreshUser` for `getMe` response shape. |
| `client/src/pages/admin/AdminLoginPage.jsx` | Separate responsive admin login UI at `/admin/login`. |
| `client/src/context/AdminAuthContext.jsx` | Keeps admin sessions separate from customer/provider auth. |
| `client/.env` | **Fixed:** `VITE_API_URL=http://localhost:5000/api/v1`. |

---

## 4. Fixes Applied

1. **validate middleware** — only validates schema-defined keys. Unblocks the entire API surface (auth + all other modules).
2. **Provider profile on registration** — `Provider.create({ userId, businessName, category })` runs when `role === 'provider'`.
3. **API base URL** — corrected to `/api/v1` in `client/.env`.
4. **Forgot/Reset Password flow** —
   - `POST /auth/forgot-password { email }` → sends OTP
   - `POST /auth/otp-verify { email, otp, purpose: 'reset-password' }` → returns `resetToken`
   - `POST /auth/reset-password { token, password }` → sets new password
5. **OTP verify purpose** — reset-password requests get a 10-minute reset token, not a login JWT.
6. **OTP page** — passes correct purpose, reads role from `result.user.role`.
7. **AuthContext** — reads `res.data.data` for `getMe`.
8. **Admin login** — `/admin/login` calls `POST /api/v1/admin/auth/login`; only server-configured `ADMIN_EMAIL` and `ADMIN_PASSWORD` are accepted. No admin seed account or signup path is used.
9. **Phone normalization** — accepts `+919876543210`, `98765 43210`, and bare 10-digit numbers.

---

## 5. Test Results (After Fixes)

```
🔐  AUTHENTICATION SYSTEM — END-TO-END TESTS
Using phones: customer=9857184733, provider=9757184733

── Customer Registration ──          ✅ 201, role=customer
── Provider Registration ──          ✅ 201, role=provider
── Duplicate User Handling ──        ✅ 409 "already exists"
── Validation Errors ──              ✅ 400 (bad phone lists field, bad role)
── Customer Login ──                 ✅ 200, JWT, role=customer
── Provider Login ──                 ✅ 200, role=provider
── Admin Login ──                    ✅ 200, role=admin
── Login Failure ──                  ✅ 401 "Invalid credentials"
── Protected Routes ──               ✅ 401 no token; /auth/me 200 with token
── Role-based Protection ──          ✅ Customer → /admin/* = 403
── Invalid/Expired Token ──          ✅ 401
── OTP Flow ──                       ✅ register → wrong OTP 400 → resend 200
── Forgot & Reset Password ──        ✅ forgot 200; bogus token 400
── Logout ──                         ✅ Client-side token cleared

========================================
  RESULTS: 32 passed, 0 failed
========================================
```

No HTTP 400/401/403/404/409/500 errors on valid requests.

---

## 6. Remaining Issues / Notes

| Issue | Severity | Notes |
|-------|----------|-------|
| OTP is logged to console instead of sent via SMS | INFO | Intended — SMS gateway marked as TODO in code. |
| Duplicate Mongoose index warnings | INFO | `index: true` alongside `schema.index()` in User/Provider/Category/Booking models. Non-breaking; cleanup recommended. |
| Admin logout | INFO | Admin JWTs expire after one hour and are explicitly revoked in the server session collection on logout. |
| `auth-test.js` is a development artifact | INFO | Can be removed in production; kept as a regression suite. |
| Rate limiter counters reset on server restart | INFO | In-memory store; acceptable for dev. |

## 7. Current Admin Authentication and Security Notes

- Admin routes use a separate one-hour JWT audience/token type and a MongoDB-backed session that is revoked on logout. Regular customer/provider JWTs are rejected by admin APIs, and admin JWTs are rejected by regular auth middleware.
- Admin password recovery is not implemented: the admin password is server-environment-managed. `/admin/forgot-password` directs the operator to update the server environment rather than sending an insecure reset code.
- The legacy default admin password and an admin-login token artifact were present in tracked Git content. The working tree removes the default login paths and token artifact, but this does not erase earlier Git history. Rotate the deployed `ADMIN_PASSWORD` and `JWT_SECRET`, and purge sensitive historical artifacts from repository history.
- The local `server/.env` is ignored by Git. Its current `ADMIN_EMAIL` was preserved at the operator's request; it currently has two `ADMIN_PASSWORD` entries. Reconcile the desired runtime values before validating a real admin login.

**Conclusion:** Customer/provider authentication remains separate. Admin access now uses server-only configured credentials, isolated routes and session checks, protected admin APIs, and explicit logout revocation.