# Pro Alpha OS

Canonical editable source for the Pro Alpha OS Annual OS Membership release, reconstituted from the production product and upgraded from recovered source revision `8e7b2de5ea7cd30cd52f9b5f17fa71bbfa2eb54b`.

## Production identity
- Vercel project: `pro-alpha-os`
- Project ID: `prj_FrZbXKeI7zkkmvbK9xKqNZBgRzXh`
- Team: `team_gisTqFWgdDjnu57lZHD06IKn`
- Canonical URL: https://pro-alpha-os.vercel.app/

## Release gates
The recovered release passed build, typecheck, lint, 7/7 tests and desktop/tablet/mobile browser QA before repository publication.

## Production configuration
Provision PostgreSQL and run `npm run db:migrate`. Configure `DATABASE_URL`, Stripe secret and signed webhook, Resend sender credentials, `CRON_SECRET`, `OPERATOR_API_TOKEN`, and `NEXT_PUBLIC_APP_URL=https://pro-alpha-os.vercel.app`. Keep `COMMERCE_ENABLED=false` until authenticated payment, webhook, membership provisioning and Desk access are verified in the deployment environment.

Year One MSRP: $4,999. Full-pay price: $4,499. Continuing membership: $999/year. Financing flags remain disabled until the corresponding merchant integration is production-ready.

Payment redirects are not payment authority. Only verified signed provider events mark payments paid. Provisioning is retry-safe and idempotent. OS activation is distinct from entity, election, filing, payroll and benefit effectiveness.
