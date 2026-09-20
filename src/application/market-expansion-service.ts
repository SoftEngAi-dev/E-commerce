import type { PostgresDatabase } from "../persistence/postgres.js";
import { assessMarket, type MarketSignals } from "./market-expansion.js";

export async function evaluateAndPersistMarket(db:PostgresDatabase,market:string,currency:string,signals:MarketSignals){
  const assessment=assessMarket(signals);
  await db.query(
    `INSERT INTO market_profiles(market,currency,status,payment_coverage,regulatory_complexity,supplier_coverage)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(market) DO UPDATE SET currency=EXCLUDED.currency,status=EXCLUDED.status,payment_coverage=EXCLUDED.payment_coverage,regulatory_complexity=EXCLUDED.regulatory_complexity,supplier_coverage=EXCLUDED.supplier_coverage,updated_at=now()`,
    [market.toUpperCase(),currency,assessment.status,signals.paymentCoverage,signals.regulatoryComplexity,signals.supplierCoverage]
  );
  return assessment;
}
