# Pro Alpha OS

Maintainable reconstitution of the Pro Alpha public product, upgraded into one Annual OS Membership. Existing production has not been overwritten.

## Identity and checkpoints

Only deploy to project `prj_FrZbXKeI7zkkmvbK9xKqNZBgRzXh`, name `pro-alpha-os`, team `team_gisTqFWgdDjnu57lZHD06IKn`. Canonical URL: https://pro-alpha-os.vercel.app/. Historical deployment: `dpl_BVoHWTFHoceSV1eWscvUJByqXFJS`.

Git tag `pro-alpha-production-reconstituted-baseline` preserves six observed public routes and hashes. This checkpoint captures public content and visual assets; it does not recover unavailable historical private customer records or original backend source. No historical customer data has been migrated. The integrated two-entity, evidence, election, ownership and obligations model is retained explicitly.

## Run and verify

Node 24; `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Browser QA: `node scripts/extract-browser.mjs && node scripts/browser-qa.mjs`. Tests exercise PostgreSQL-compatible SQL through PGlite, authentic Stripe signature verification, provisioning retries, workflow constraints and the captured public baseline.

## Production configuration

Copy `.env.example` into the deployment environment. Provision PostgreSQL and run `npm run db:migrate`. Configure Stripe secret and signed webhook at `/api/webhooks/stripe`. Set Resend sender credentials for account sign-in and renewal reminders. Set cron and operator secrets. Verify all payment and authentication journeys with test credentials before live credentials and COMMERCE_ENABLED=true. Never enable financing flags until merchant approval and an operational supported Stripe adapter exist.

Full-pay $4,499 against MSRP $4,999; continuing membership $999/year. Card payments create an annual renewal schedule after the paid first year. Financing customers require a reusable renewal payment method and remain PAYMENT_METHOD_REQUIRED until configured. External government/provider costs are authorized separately at actual cost. Pricing and policy version are centralized in `src/lib/config.ts`.

Only verified signed payment events mark payments paid. Provisioning uses persisted payment/customer locks and unique membership/Desk/module constraints. Checkout persists provider idempotency keys before provider calls. Paid provisioning failures are recoverable via webhook retries, activation and authenticated cron recovery. Payment redirects are not payment authority. Private APIs require hashed expiring sessions and ownership checks.

Workflow operator transitions require server credentials, current versions, dependency checks and authorization/external evidence. Customer facts cannot assert accepted legal status. External submission integrations and specialist decisions are not fabricated or automatically inferred. Evidence references record provenance; no invented filing acceptance is generated.

## Remaining live validation

No live payment, renewal, mail, deployment or historical data migration has been exercised without credentials. Production commerce must remain disabled until real authenticated payment, renewal, cross-account and deployment verification passes.