import type { PostgresDatabase } from "../persistence/postgres.js";
import { recoverStaleJobs } from "../persistence/job-queue-pg.js";
export async function recoverJobs(db:PostgresDatabase,staleMs=300000){return recoverStaleJobs(db,staleMs)}
