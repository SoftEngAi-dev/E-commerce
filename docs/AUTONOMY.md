# Autonomous operating loop
observe -> normalize -> score -> compliance -> propose -> risk gate -> execute -> measure -> learn.

Agents emit evidence and typed actions. High-risk or irreversible actions are approval-gated. External side effects must carry idempotency keys and create auditable events.

The AI boundary supports local/rule-based providers first; external models are adapters rather than core dependencies.
