export class FixedWindowLimiter {
  private readonly buckets = new Map<string,{count:number;resetAt:number}>();
  constructor(private readonly maxRequests=60,private readonly windowMs=60_000){}
  allow(key:string,now=Date.now()):boolean{
    const current=this.buckets.get(key);
    if(!current||current.resetAt<=now){this.buckets.set(key,{count:1,resetAt:now+this.windowMs});return true}
    if(current.count>=this.maxRequests)return false;
    current.count+=1;return true;
  }
}
