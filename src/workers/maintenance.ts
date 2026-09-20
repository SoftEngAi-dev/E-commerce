import type { PostgresDatabase } from "../persistence/postgres.js";
import { recoverStaleJobs } from "../persistence/job-queue-pg.js";
import { releaseExpiredReservations } from "./inventory-expiry.js";

export async function runMaintenanceCycle(db:PostgresDatabase){
  const recoveredJobs=await recoverStaleJobs(db,300000);
  const expiredReservations=await releaseExpiredReservations(db,100);
  return{recoveredJobs,expiredReservations};
}
