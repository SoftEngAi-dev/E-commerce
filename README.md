# Autonomous E-commerce Platform

Modular commerce core for international dropshipping, multi-provider commerce and AI-assisted autonomous operations.

## Current release

**v1.9 production connectors + autonomy foundation**

- TypeScript domain core with deterministic pricing and order state machine
- PostgreSQL persistence, idempotency, outbox and durable jobs
- Inventory reservation, expiry, retries and worker recovery
- Provider-neutral payments and fulfillment
- Authorized supplier connector contracts and automated import
- Acquisition-channel contracts and publication state
- Support AI/content generation and acquisition attribution
- Mercado Pago Orders API adapter
- Verified webhook processing with durable synchronization jobs
- Fulfillment and tracking workers
- Product intelligence, supplier compliance and market policy gates
- Persistent knowledge and agent memory
- Configurable OpenAI-compatible/local AI provider
- Evidence-backed AI review and autonomous risk gates
- Analytics, recommendations and learning outcomes
- Multi-store/multi-market persistence
- Optional tax and FX provider ports
- Authenticated internal endpoints for n8n
- Next.js storefront and operations UI
- Docker, Docker Compose, CI and OpenAPI

## Core loop

    supplier -> normalize -> score -> compliance -> publish
            -> quote -> reserve -> pay -> verify
            -> fulfill -> track -> measure -> learn
            -> propose -> risk gate -> execute

The core is provider-agnostic. Supplier, payment, fulfillment, tax, FX and AI implementations are replaceable adapters.

Autonomous actions are evidence-backed and policy-gated. Financial, regulated, destructive or irreversible operations remain explicitly controlled.

## Local start

See `docs/SETUP.md` or run `scripts/start-dev.ps1` on Windows.

## Roadmap

- Connect authorized supplier APIs/feeds
- Real tax/FX provider implementations per market
- Production operator identity and approval UI
- Acquisition-channel adapters and attribution
- Conversion/cohort analytics
- Backup/disaster recovery
- Sandbox-to-production certification for each payment and fulfillment provider