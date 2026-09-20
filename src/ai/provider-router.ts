import type { AIProvider, LLMRequest, LLMResponse } from "./provider.js";

export interface RoutePolicy{
  preferLocal:boolean;
  allowExternalFallback:boolean;
  maxExternalRisk:"low"|"medium"|"high"|"critical";
}

const rank={low:0,medium:1,high:2,critical:3} as const;

export class AIProviderRouter implements AIProvider{
  readonly id="ai-router";
  constructor(private readonly local:AIProvider,private readonly external?:AIProvider,private readonly policy:RoutePolicy={preferLocal:true,allowExternalFallback:false,maxExternalRisk:"medium"}){}
  async complete(request:LLMRequest & {risk?:keyof typeof rank}):Promise<LLMResponse>{
    if(this.policy.preferLocal){try{return await this.local.complete(request)}catch(error){if(!this.external||!this.policy.allowExternalFallback)throw error}}
    if(this.external&&(request.risk===undefined||rank[request.risk]<=rank[this.policy.maxExternalRisk]))return this.external.complete(request);
    return this.local.complete(request);
  }
}
