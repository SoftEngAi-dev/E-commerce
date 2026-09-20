export interface SupplierPolicy{dropshippingAllowed?:boolean;marketplaceAllowed?:boolean;adModificationAllowed?:boolean;internationalSalesAllowed?:boolean;restrictedTerritories?:string[]}
export interface ComplianceInput{policy:SupplierPolicy;market:string;claims:string[];channel:"store"|"marketplace"|"social"}
export interface ComplianceResult{allowed:boolean;reasons:string[]}
export function checkCompliance(i:ComplianceInput):ComplianceResult{
  const reasons:string[]=[];
  if(i.policy.dropshippingAllowed===false)reasons.push("supplier-disallows-dropshipping");
  if(i.channel==="marketplace"&&i.policy.marketplaceAllowed===false)reasons.push("marketplace-sales-not-authorized");
  if(i.claims.some(c=>/cure|treat|prevent|guarantee/i.test(c)))reasons.push("unverified-health-or-outcome-claim");
  if(i.policy.internationalSalesAllowed===false)reasons.push("international-sales-not-authorized");
  if(i.policy.restrictedTerritories?.includes(i.market))reasons.push("market-restricted-by-supplier");
  return{allowed:reasons.length===0,reasons}
}
