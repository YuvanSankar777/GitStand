/** A realistic-looking git log seeded for the demo — includes clear blocker signals. */
export const SAMPLE_GIT_LOG = `a1f9c02 feat(auth): add JWT session middleware
7d3e881 feat(auth): wire login form to /api/session
b90c714 test(auth): add token expiry cases
c22a5de WIP: refresh token rotation not persisting
e4471aa fix broken refresh token storage
19ff830 revert "fix broken refresh token storage"
d8b0192 auth: still failing on token refresh, debugging redis
5c7e410 feat(billing): stripe webhook handler for invoice.paid
f0a9b31 fix(billing): handle missing customer id on webhook
2ab7cc9 docs: update README with auth setup steps
9e1d774 chore: bump next to 16.3, tidy eslint config
4c6f208 TODO: rate-limit the session endpoint before launch`;

export const SAMPLE_TICKETS = `AUTH-142 Implement refresh token rotation
BILL-88 Handle Stripe invoice.paid webhook
AUTH-150 Rate limit session endpoint`;
