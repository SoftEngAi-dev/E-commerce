import { z } from "zod";

const schema=z.object({
  NODE_ENV:z.enum(["development","test","production"]).default("development"),
  PORT:z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL:z.string().min(1),
  ADMIN_API_KEY:z.string().min(16),
  WEBHOOK_SECRET:z.string().min(16),
  MERCADO_PAGO_WEBHOOK_SECRET:z.string().min(16).optional(),
  MERCADO_PAGO_ACCESS_TOKEN:z.string().min(1).optional(),
  CHECKOUT_SUCCESS_URL:z.string().url().optional(),
  CHECKOUT_FAILURE_URL:z.string().url().optional(),
  CHECKOUT_PENDING_URL:z.string().url().optional()
});

export type AppConfig=z.infer<typeof schema>;

export function loadConfig(env:NodeJS.ProcessEnv=process.env):AppConfig{
  const config=schema.parse(env);
  if(config.NODE_ENV==="production"&&config.ADMIN_API_KEY.length<32)throw new Error("ADMIN_API_KEY must be at least 32 characters in production");
  if(config.NODE_ENV==="production"&&config.WEBHOOK_SECRET.length<32)throw new Error("WEBHOOK_SECRET must be at least 32 characters in production");
  if(config.MERCADO_PAGO_ACCESS_TOKEN&&(!config.CHECKOUT_SUCCESS_URL||!config.CHECKOUT_FAILURE_URL||!config.CHECKOUT_PENDING_URL))throw new Error("Checkout return URLs are required when Mercado Pago is enabled");
  if(config.MERCADO_PAGO_ACCESS_TOKEN&&!config.MERCADO_PAGO_WEBHOOK_SECRET)throw new Error("MERCADO_PAGO_WEBHOOK_SECRET is required when Mercado Pago is enabled");
  return config;
}
