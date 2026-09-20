# Autonomous E-commerce Platform

Modular commerce core for international dropshipping, multi-provider commerce and AI-assisted autonomous operations.

## v1.4 Production Foundation

- strict TypeScript domain core
- deterministic server-side pricing
- explicit order state machine
- PostgreSQL migrations for commerce state
- inventory reservation model
- retryable jobs and dead-letter behavior
- idempotency and audit contracts
- HMAC webhook verification and replay protection
- admin API-key boundary
- supplier/payment/fulfillment provider ports
- Docker and CI foundation
- n8n-compatible event schema
- health and readiness endpoints

## Design

The commerce core is provider-agnostic. Supplier, payment, fulfillment, tax, FX and AI implementations can be replaced without rewriting domain logic.

Autonomous actions are evidence-backed and pass through risk gates. High-risk or irreversible operations remain explicitly gated.

## Roadmap

v1.4 foundation -> v1.5 real provider adapters -> v1.6 storefront/admin -> v1.7 AI orchestration -> v1.8 international expansion and learning loops.
