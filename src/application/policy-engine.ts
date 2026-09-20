export interface PolicyContext{
  market:string;
  channel:string;
  category?:string;
  supplierAuthorized:boolean;
  marketEnabled:boolean;
  channelEnabled:boolean;
}
export interface PolicyDecision{allowed:boolean;reasons:string[]}
export function evaluatePolicy(ctx:PolicyContext):PolicyDecision{
  const reasons:string[]=[];
  if(!ctx.supplierAuthorized)reasons.push("supplier-not-authorized");
  if(!ctx.marketEnabled)reasons.push("market-disabled");
  if(!ctx.channelEnabled)reasons.push("channel-disabled");
  if(ctx.category?.toLowerCase().includes("regulated"))reasons.push("regulated-category-requires-explicit-review");
  return{allowed:reasons.length===0,reasons};
}
