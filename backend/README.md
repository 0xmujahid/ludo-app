# Backend Setup & NOWPayments Integration

## Prerequisites
- Node.js >= 20
- PostgreSQL instance accessible to the application
- NOWPayments account with REST API and IPN credentials

## Environment
Copy `env.example` to `.env` (or `.env.prod`) and update the placeholders:

```bash
cp env.example .env.prod
```

Key variables:
- `NOWPAYMENTS_SANDBOX` – enable (`true`) to target the sandbox API
- `NOWPAYMENTS_API_KEY` / `NOWPAYMENTS_API_BASE_URL` – production credentials
- `NOWPAYMENTS_SANDBOX_API_KEY` / `NOWPAYMENTS_SANDBOX_API_BASE_URL` – sandbox credentials
- `NOWPAYMENTS_IPN_SECRET` / `NOWPAYMENTS_SANDBOX_IPN_SECRET` – HMAC secret used for webhook verification
- `NOWPAYMENTS_IPN_CALLBACK_URL` – publicly reachable URL for IPN webhooks (defaults to `<BACKEND_URL>/api/crypto/webhook`)
- `NOWPAYMENTS_SUCCESS_URL` / `NOWPAYMENTS_CANCEL_URL` – URLs that NOWPayments should redirect the player to after checkout
- `APP_URL`, `BACKEND_URL` – used when deriving default callback routes

The sample file also includes database and JWT placeholders that should be replaced for your environment.

## Database
Run migrations to provision the crypto tables and default conversion rates (USD, SOL, USDT, ETH, BTC):

```bash
npm run migration:run
```

## Development
```
npm install
npm run build
npm start
```

The crypto endpoints are available under `/api/crypto/*` once the server boots.

## Sandbox vs Production
- Keep `NOWPAYMENTS_SANDBOX=true` while testing. The service automatically falls back to sandbox keys/base URL when enabled.
- When you are ready for production, set `NOWPAYMENTS_SANDBOX=false` and provide live API credentials and IPN secret.
- The IPN secret must match the value configured in the NOWPayments dashboard; otherwise webhook verification will fail.

## Manual Test Checklist
1. **Currencies** – `GET /api/crypto/currencies` should list the active conversion rates (USD + supported crypto).
2. **Estimate** – `POST /api/crypto/estimate` with `{ usdAmount, cryptoCurrency }` returns tokens, conversion rate, and pay amount.
3. **Create Payment** – `POST /api/crypto/deposit` generates a NOWPayments invoice and stores it in `crypto_transactions`.
4. **Webhook** – send a signed payload to `/api/crypto/webhook` to confirm signature validation and wallet crediting.
5. **Status Polling** – `GET /api/crypto/transaction/:paymentId` updates the record and triggers wallet credit on `finished` payments.
6. **Mobile App** – use the Add Money screen to walk through the sandbox flow and confirm the wallet updates after webhook confirmation.

## Test & Build
```
# Run backend tests (passes even when suites are empty)
npm run test

# Build TypeScript output
npm run build
```


