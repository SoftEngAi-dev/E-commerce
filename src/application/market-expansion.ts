export interface MarketSignals{demand:number;competition:number;shipping:number;paymentCoverage:number;regulatoryComplexity:number;supplierCoverage:number}
export interface MarketAssessment{score:number;status:"pilot"|"review"|"blocked"}
export function assessMarket(s:MarketSignals):MarketAssessment{
  const score=Math.max(0,Math.min(100,.25*s.demand+.18*(100-s.competition)+.15*(100-s.shipping)+.18*s.paymentCoverage+.12*(100-s.regulatoryComplexity)+.12*s.supplierCoverage));
  const status=score>=72?"pilot":score>=52?"review":"blocked";
  return{score,status}
}
