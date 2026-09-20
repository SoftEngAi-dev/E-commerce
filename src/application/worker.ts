import { exponentialBackoff } from "./job-queue.js";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { claimJobs, completeJob, failJob } from "../persistence/job-queue-pg.js";

export type JobHandler=(job:{id:string;type:string;payload:unknown})=>Promise<void>;

export class Worker{
  constructor(private db:PostgresDatabase,private workerId:string,private handlers:Map<string,JobHandler>){}
  async runOnce(limit=10){
    const jobs=await claimJobs(this.db,this.workerId,limit);
    for(const j of jobs){
      const handler=this.handlers.get(j.type);
      try{
        if(!handler)throw new Error("No handler for "+j.type);
        await handler({id:j.id,type:j.type,payload:j.payload});
        await completeJob(this.db,j.id,this.workerId);
      }catch(e){
        await failJob(this.db,j.id,this.workerId,e instanceof Error?e.message:"Unknown error",exponentialBackoff(j.attempts));
      }
    }
    return jobs.length;
  }
}
