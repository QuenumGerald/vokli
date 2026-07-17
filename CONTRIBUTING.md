# Contributing

Vokli requires Node.js 22+ and pnpm.

1. Create a focused branch and keep changes within one clear responsibility.
2. Do not expose phase-future behavior with placeholders or fake
   implementations.
3. Add behavioral tests for public behavior and actionable error cases.
4. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
   `pnpm format:check` before opening a pull request.

Public API additions need a concrete consumer and an architecture rationale.
Keep provider-neutral concepts in `core`; provider-specific behavior belongs in
its provider package.
