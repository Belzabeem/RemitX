# Issue cleanup (proposal)

`gh` was not authenticated in the authoring environment, so open issues and PRs were **not reviewed**. Nothing was closed. Do this pass yourself against the live tracker.

## How to triage
- Close with a reason: duplicates, issues describing removed features (database setup, server-side key generation, hardcoded rates), and anything that depends on a database being live.
- Rewrite: vague issues ("improve UI") into one deliverable with acceptance criteria.

## Labels
`area:contracts` `area:app` `area:core` `area:docs` `type:bug` `type:feature` `type:test` `good first issue` `needs-design` `blocked:testnet-access`

## Ten scoped issues
1. **Verify routes on live testnet.** Run the optional integration script against Horizon testnet. Done when a path payment XLM→USDC succeeds and results are recorded in docs/STELLAR-INTEGRATION.md.
2. **Postgres adapter.** Implement the repository interfaces with Prisma under `src/lib/data/prisma`. Done when `DATA_MODE=prisma` passes the repository tests against a local Postgres.
3. **Deploy escrow to testnet.** Follow docs/DEPLOYMENTS.md. Done when the real contract ID, commit and date are recorded and the indexer syncs one deposit.
4. **Shared rate limiter.** Replace in-memory limits and SEP-10 used-challenge set with a shared store. Done when two instances reject a replayed challenge.
5. **SEP-24 interactive flow.** SEP-10 token to anchor, open interactive URL. Done against one testnet anchor with a test.
6. **Password reset email.** Add a mailer behind an env flag. Done when the reset link is delivered and tested with a mock transport.
7. **Remove demo-login GET.** Gate demo login behind `NODE_ENV !== production` and make it POST. Done with a test.
8. **Component tests.** Add React Testing Library tests for ConnectDialog and the send form. Done when coverage for `src/components` is above 60%.
9. **Exchange contract review.** Property tests for CPMM invariant, rounding and slippage. Done when tests pass and any bug is fixed in its own commit.
10. **Staking and governance review.** Test reward math, quorum and double-vote. Same acceptance as above; update docs/CONTRACTS.md for those sections.
