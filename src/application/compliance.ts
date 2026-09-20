export interface SupplierPolicy{
  dropshippingAllowed?:boolean;
  marketplaceAllowed?:boolean;
  adModificationAllowed?:boolean;
  internationalSalesAllowed?:boolean;
  restrictedTerritories?:string[];
}
export interface ComplianceInput{policy:SupplierPolicy;market:string;claims:string[];channel:"store"|"marketplace"|"social"}
export interface ComplianceResult{allowed:boolean;reasons:string[]}

export function checkCompliance(i:ComplianceInput):ComplianceResult{
  const reasons:string[]=[];
  if(i.policy.dropshippingAllowed!==true)reasons.push("supplier-dropshipping-not-verified");
  if(i.policy.internationalSalesAllowed!==true)reasons.push("international-sales-not-verified");
  if(i.channel==="marketplace"&&i.policy.marketplaceAllowed!==true)reasons.push("marketplace-sales-not-verified");
  if(i.channel==="social"&&i.policy.adModificationAllowed!==true)reasons.push("social-ad-modification-not-verified");
  if(i.claims.some(c=>/cure|treat|prevent|guarantee/i.test(c)))reasons.push("unverified-health-or-outcome-claim");
  if(i.policy.restrictedTerritories?.includes(i.market))reasons.push("market-restricted-by-supplier");
  return{allowed:reasons.length===0,reasons}
}
