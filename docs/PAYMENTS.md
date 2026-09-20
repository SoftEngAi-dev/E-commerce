# Payments

The payment layer is provider-neutral.

## Mercado Pago Uruguay

The first real adapter targets Mercado Pago's Orders API for Checkout Pro. The adapter sends the access token as a Bearer token and an idempotency key for each checkout attempt. The provider returns a hosted `checkout_url`.

The application stores the provider order id in `payment_attempts`. Webhooks are verified with Mercado Pago's `x-signature` plus `x-request-id` and the notification's `data.id`. A verified notification creates a durable `payment.sync` job; the worker then queries Mercado Pago for authoritative state before changing the local order.

Do not put provider secrets in Git. Configure `MERCADO_PAGO_ACCESS_TOKEN` and `MERCADO_PAGO_WEBHOOK_SECRET` through the deployment secret store.

For Uruguay, the current official developer documentation lists Checkout Pro and Checkout API availability and documents the Orders API endpoint as `POST /v1/orders`.
