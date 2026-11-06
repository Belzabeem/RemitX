# Threat model

Scope: the Next.js app and Soroban contracts in this repository. Testnet only; not audited.

| Threat | Mitigation | Gap |
| --- | --- | --- |
| Server holds user keys | None are stored or logged; wallet signs everything | Depends on wallet-kit and wallet integrity |
| Tampered transaction between quote and submit | `assertSignedXdrMatches` checks source, op type, recipient, amount, signature | Only path-payment-strict-send is accepted |
| Bad price / slippage | `destMin` enforced on-chain (1% below quote) | Quote is only as good as Horizon's path data |
| Fabricated rates | Rates endpoints return 503 when sources fail; no hardcoded fallback | Stale last-known rate is labelled `stale` |
| Login replay | SEP-10 challenges are time-limited and single-use | Used-challenge set is in-process only |
| Weak session secret | `JWT_SECRET` (>=32 chars) required in production | None known |
| SSRF via anchor URLs | `isSafePublicHttpsUrl` rejects non-HTTPS and private hosts | DNS rebinding not specifically handled |
| CSV formula injection | Export neutralizes leading `= + - @` | None known |
| Brute force | Rate limits on auth, verify and quote endpoints | In-memory, per instance |
| Escrow over-payout | `settled` tracking; fee capped at 5%; pause blocks deposit/release | Contracts unaudited; release authority is one platform key |
| Data loss | None: memory mode loses everything on restart | **Persistence is not production-ready** |

Out of scope today: KYC/AML, anchor trust, custody of fiat, mainnet operations, key management for the platform release authority.
