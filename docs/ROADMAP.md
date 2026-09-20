# Delivery roadmap

## Implemented
- Core commerce domain and pricing
- PostgreSQL persistence
- Inventory reservation and expiry
- Idempotent orders and payment attempts
- HMAC/provider webhook verification
- Mercado Pago adapter
- Fulfillment adapter and workers
- Tracking synchronization
- Product intelligence and compliance
- Market assessment and market policies
- Analytics and recommendations
- Autonomous risk gate
- Persistent knowledge and agent memory
- Configurable OpenAI-compatible AI provider
- n8n automation templates
- Storefront and operations UI
- Multi-store persistence foundation
- Docker/CI/OpenAPI

## Next production tranche
- Connect an authorized supplier API/feed
- Configure real market policy records
- Configure production payment and fulfillment secrets
- Add tax and FX provider implementations per target market
- Add production identity/authentication for operators
- Add real acquisition-channel adapters and attribution
- Expand analytics from order metrics to conversion and cohort metrics
- Add approval UI for gated AI actions
- Add backup/restore and disaster-recovery automation
- Run live sandbox transactions before production enablement

The platform should not automatically publish or transact until supplier permissions, market policy, payment and fulfillment credentials are configured and tested.
