# BudgetPlanner entitlement matrix

The live Supabase entitlement configuration is the source of truth for feature access.

| Feature | Free | Plus | Pro |
|---|---:|---:|---:|
| BudgetPlanner app | Yes | Yes | Yes |
| Core budgeting | Yes | Yes | Yes |
| Local persistence | Yes | Yes | Yes |
| Workbook export | Yes | Yes | Yes |
| Google Sheets | No | Yes | Yes |
| Cloud sync | No | Yes | Yes |
| AI Insights | No | No | Yes |
| Advanced Analytics | No | No | Yes |
| Automation | No | No | Yes |

## Enforcement

- The frontend uses Toolkit entitlements to enable or disable paid UI.
- Cloud workbook load/save is server-enforced through the budget.cloudSync feature.
- AI Insights is server-enforced through the budget.aiInsights feature.
- Subscription validity includes active/trialing/past-due/incomplete states with an unexpired period; expired subscriptions fall back to Free behavior.
- Monime remains the authority for activating paid subscriptions when billing is enabled.
- Free accounts remain local-only for workbook persistence.

## Acceptance status

- Plus budget.cloudSync: active in production configuration.
- Pro budget.cloudSync: active in production configuration.
- Free cloud sync: not granted.
- Server-side cloud-sync enforcement: verified in server.ts.
- Existing production cloud snapshot: present and populated.
- Full authenticated API save/load round-trip: still requires end-to-end acceptance with a real Firebase-authenticated Plus/Pro test account.
