import type { PostgresDatabase } from "./postgres.js";

export async function upsertKnowledgeDocument(
  db:PostgresDatabase,
  input:{source:string;externalId?:string;title:string;content:string;metadata?:Record<string,unknown>}
){
  const r=await db.query<{id:string}>(
    `INSERT INTO knowledge_documents(source,external_id,title,content,metadata)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(source,external_id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,metadata=EXCLUDED.metadata,updated_at=now()
     RETURNING id`,
    [input.source,input.externalId??null,input.title,input.content,input.metadata??{}]
  );
  return r.rows[0]?.id;
}

export async function remember(
  db:PostgresDatabase,
  input:{agent:string;memoryType:string;content:string;importance?:number;metadata?:Record<string,unknown>;expiresAt?:Date}
){
  const importance=input.importance??50;
  if(importance<0||importance>100)throw new Error("importance must be between 0 and 100");
  const r=await db.query<{id:string}>(
    "INSERT INTO agent_memory(agent,memory_type,content,importance,metadata,expires_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [input.agent,input.memoryType,input.content,importance,input.metadata??{},input.expiresAt??null]
  );
  return r.rows[0]?.id;
}

export async function searchMemory(db:PostgresDatabase,input:{agent?:string;query:string;limit?:number}){
  const limit=Math.min(Math.max(1,Math.trunc(input.limit??10)),50);
  const values:unknown[]=[input.query];
  let agentClause="";
  if(input.agent){values.push(input.agent);agentClause="AND agent=$2";}
  values.push(limit);
  const limitParam=input.agent?"$3":"$2";
  const r=await db.query<{id:string;agent:string;memory_type:string;content:string;importance:number;metadata:Record<string,unknown>;created_at:Date;rank:number}>(
    `SELECT id,agent,memory_type,content,importance,metadata,created_at,
      ts_rank_cd(to_tsvector('simple',content),plainto_tsquery('simple',$1)) AS rank
      FROM agent_memory
      WHERE (expires_at IS NULL OR expires_at>now())
        ${agentClause}
        AND to_tsvector('simple',content) @@ plainto_tsquery('simple',$1)
      ORDER BY rank DESC,importance DESC,created_at DESC LIMIT ${limitParam}`,
    values
  );
  return r.rows;
}

export async function searchKnowledge(db:PostgresDatabase,input:{query:string;limit?:number}){
  const limit=Math.min(Math.max(1,Math.trunc(input.limit??10)),50);
  const r=await db.query<{id:string;source:string;title:string;content:string;metadata:Record<string,unknown>;rank:number}>(
    `SELECT id,source,title,content,metadata,
      ts_rank_cd(search_vector,plainto_tsquery('simple',$1)) AS rank
      FROM knowledge_documents
      WHERE search_vector @@ plainto_tsquery('simple',$1)
      ORDER BY rank DESC,updated_at DESC LIMIT $2`,
    [input.query,limit]
  );
  return r.rows;
}
