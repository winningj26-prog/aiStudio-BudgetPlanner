# Toolkit Multi-Tenant / Multi-Product Architecture

## Decision

Toolkit will initially use a shared Supabase project for cost efficiency while enforcing strict tenant and product boundaries in application code, repositories, database tables, and RLS policies.

A product may later move to its own Supabase project without changing its domain model or public product contract.

## Tenant model

A tenant is the Toolkit account/household boundary. A user authenticates as a member of a tenant.

Conceptually:

    auth user
       |
       v
    tenant/account
       |
       +-- tenant members
       |
       +-- product entitlements
       |
       +-- Product 1 domain data
       |
       +-- Product 2 domain data

The first implementation may use a single account member per tenant. The data model must not assume that a tenant can never have multiple members.

## Product boundary

Each product owns its domain:

- Product 1 owns BudgetPlanner workbook data and budget-specific behavior.
- Product 2 owns savings goals, contributions, debt accounts, debt payments, repayment scenarios, and Product 2 settings.
- Future products get their own bounded domain.

Product code must not import another product's runtime modules, storage keys, workbook snapshots, database rows, APIs, or entitlement state.

## Database strategy

Initial phase:

- One Supabase project.
- Shared platform tables for tenant/account identity and product access where appropriate.
- Product-specific tables remain explicitly scoped by tenant_id.
- RLS policies enforce tenant ownership using authenticated identity and server-side relationships.
- Product-specific repositories hide persistence details from domain logic.

Future split:

- A product can be moved to a separate Supabase project when scale, commercial independence, compliance, data residency, or operational isolation justifies it.
- The product repository/API boundary is the migration seam.
- No product should require another product's database in order to function.

## Authorization

Authorization must not depend on client-editable user metadata.

Use authenticated identity plus server-side tenant membership and entitlement relationships. Never expose service-role credentials to browser code.

## Product 2 implementation rule

Product 2 currently calls its tenant boundary accountId for compatibility with its workbook model. Product2TenantContext makes the intended platform abstraction explicit: the Product 2 account identifier is the tenant scope, while productId identifies the bounded product.

This is an implementation boundary, not a runtime dependency on Product 1.

## Migration path

1. Local Product 2 repository uses a tenant-scoped namespace.
2. Shared Supabase persistence uses the same tenant boundary with RLS.
3. Product 2 authentication resolves the authenticated user to a tenant.
4. Product entitlements determine product access.
5. If Product 2 later moves to another database, only the persistence/integration layer changes.
