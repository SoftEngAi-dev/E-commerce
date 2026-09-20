# Automation layer

n8n is an external orchestration layer. The commerce core remains usable without n8n.

Provided workflow templates:
- Product Discovery: scheduled supplier-feed ingestion, normalization, intelligence decision and candidate publication.
- Order Operations: reacts to order lifecycle events and routes automation by status.
- AI Review Loop: periodically reviews metrics, sends a typed proposal to the AI orchestrator, then records the risk-gated result.

All internal endpoints used by these templates should be protected with service authentication in deployment. Never expose internal endpoints publicly.
