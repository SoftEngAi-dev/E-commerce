export interface RecommendationContext{productId:string;price:number;inventory:number;market:string;score:number;recentUnits:number;recentRevenue:number}
export interface Recommendation{productId:string;reason:string;priority:"low"|"medium"|"high"}
export function recommend(contexts:RecommendationContext[],limit=10):Recommendation[]{
  return contexts
    .filter(c=>c.inventory>0&&c.score>=50)
    .sort((a,b)=>(b.recentRevenue+b.score)-(a.recentRevenue+a.score))
    .slice(0,limit)
    .map(c=>({productId:c.productId,reason:c.recentUnits>0?"recent-sales":"high-intelligence-score",priority:c.score>=80?"high":c.score>=65?"medium":"low"}));
}
