# Product 2 — Savings Goal and Debt Tracker

Product 2 is a standalone application. It owns its authentication, persistence, workbook, savings/debt domain, calculations, entitlements, and exports.

## Independence contract

This application must operate without Product 1 being deployed, authenticated, reachable, or persisted. No Product 1 runtime modules, storage keys, workbook snapshots, database rows, APIs, or entitlement state are dependencies.

## Foundation

The first implementation slice establishes:
- standalone domain types and validation;
- pure savings/debt calculations;
- deterministic repayment projections;
- a Product 2 repository boundary;
- standalone acceptance tests.

The UI, auth provider, cloud repository, and deployment are layered on these boundaries rather than becoming domain dependencies.
