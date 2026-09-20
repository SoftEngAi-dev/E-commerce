import type { PostgresDatabase } from "../persistence/postgres.js";

export interface DecisionOutcomeInput {
  decisionType:string;
  decisionId:string;
  context:Record<string,unknown>;
  outcome:string;
  value?:number;
  evidence?:string[];
}

export async function recordDecisionOutcome(db:PostgresDatabase,input:DecisionOutcomeInput){
  const r=await db.query<{id:string}>(
    "INSERT INTO decision_outcomes(decision_type,decision_id,context,outcome,value,evidence) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [input.decisionType,input.decisionId,input.context,input.outcome,input.value??null,input.evidence??[]]
  );
  return r.rows[0]?.id;
}

export async function createLearningExample(
  db:PostgresDatabase,
  input:{sourceOutcomeId?:string;taskType:string;input:Record<string,unknown>;expectedOutput:Record<string,unknown>;qualityScore:number;approved?:boolean}
){
  if(input.qualityScore<0||input.qualityScore>100)throw new Error("qualityScore must be between 0 and 100");
  const r=await db.query<{id:string}>(
    "INSERT INTO learning_examples(source_outcome_id,task_type,input,expected_output,quality_score,approved) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [input.sourceOutcomeId??null,input.taskType,input.input,input.expectedOutput,input.qualityScore,input.approved??false]
  );
  return r.rows[0]?.id;
}
