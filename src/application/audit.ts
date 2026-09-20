export type AuditRisk="low"|"medium"|"high"|"critical";
export interface AuditEvent{actor:string;action:string;entityType:string;entityId?:string;risk:AuditRisk;evidence:string[];metadata:Record<string,unknown>;createdAt:Date}
export interface AuditSink{write(event:AuditEvent):Promise<void>}
export class InMemoryAuditSink implements AuditSink{readonly events:AuditEvent[]=[];async write(event:AuditEvent){this.events.push({...event,metadata:{...event.metadata}})}}
