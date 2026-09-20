# v1.4 Architecture
PostgreSQL is the source of truth for commerce state. External calls are idempotent. Webhooks are signed and replay-protected. Long-running work uses retryable jobs; the outbox table decouples database transactions from downstream delivery.
Supplier, payment, fulfillment, tax, FX and AI integrations are provider ports. Autonomous AI actions pass through evidence and risk gates; high-risk or irreversible actions require explicit approval.
New markets are represented through configuration, provider coverage and policy rather than forks of the core.
