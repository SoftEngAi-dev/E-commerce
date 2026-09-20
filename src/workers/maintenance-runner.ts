import { loadConfig } from "../config.js";
import { PostgresDatabase } from "../persistence/postgres.js";
import { runMaintenanceCycle } from "./maintenance.js";

export async function runMaintenance(){
  const config=loadConfig();
  const db=new PostgresDatabase(config.DATABASE_URL);
  try{return await runMaintenanceCycle(db)}finally{await db.close()}
}

if(process.env.NODE_ENV!=="test")runMaintenance().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error);process.exitCode=1});
