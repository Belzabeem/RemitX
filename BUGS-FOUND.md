# Bugs found and fixed

| Area | Bug | Fix |
| --- | --- | --- |
| Escrow contract | Partial release/refund did not track what was paid out, so repeated partial calls could over-pay | `settled` field; remaining = amount - settled (ec58df0) |
| Escrow contract | `set_paused` stored a flag that nothing checked | `deposit` and `release` fail with `Paused` (#13); exits still work |
| Auth | Hardcoded JWT secret fallback | Required (>=32 chars) in production |
| App | Server generated and stored Stellar secret keys at registration | Removed; non-custodial signing only |
| App | `sign-and-submit` endpoint accepted secrets | Endpoint deleted |
| Rates | Hardcoded fallback rate and "1.00" shown when sources failed | 503 or labelled `stale` |
| Core (Rust) | clippy errors and an orphaned CSRF test | Fixed and re-homed |
| Build | `postinstall: prisma generate` broke `npm install` without a DB | Prisma/Supabase removed from dependencies |
