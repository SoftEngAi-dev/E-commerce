export interface LLMRequest{system:string;prompt:string;temperature?:number}
export interface LLMResponse{output:string;model:string;usage?:{inputTokens:number;outputTokens:number}}
export interface AIProvider{readonly id:string;complete(request:LLMRequest):Promise<LLMResponse>}
export class RuleBasedAIProvider implements AIProvider{readonly id="rule-based-local";async complete(request:LLMRequest){return{output:"",model:this.id,usage:{inputTokens:request.prompt.length,outputTokens:0}}}}
