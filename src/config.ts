import { z } from "zod";
const schema=z.object({NODE_ENV:z.enum(["development","test","production"]).default("development"),PORT:z.coerce.number().int().positive().max(65535).default(3000),DATABASE_URL:z.string().min(1),ADMIN_API_KEY:z.string().min(16),WEBHOOK_SECRET:z.string().min(16).default("development-webhook-secret")});
export type AppConfig=z.infer<typeof schema>;
export function loadConfig(env:NodeJS.ProcessEnv=process.env):AppConfig{return schema.parse(env)}
