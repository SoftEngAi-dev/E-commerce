export interface LLMRequest{system:string;prompt:string;temperature?:number}
export interface LLMResponse{output:string;model:string;usage?:{inputTokens:number;outputTokens:number}}
export interface AIProvider{readonly id:string;complete(request:LLMRequest):Promise<LLMResponse>}

export class RuleBasedAIProvider implements AIProvider{
  readonly id="rule-based-local";
  async complete(request:LLMRequest){return{output:"",model:this.id,usage:{inputTokens:request.prompt.length,outputTokens:0}}}
}

export interface HttpAIProviderConfig{
  id:string;
  baseUrl:string;
  token?:string;
  model:string;
  path?:string;
}

interface ChatResponse{
  model?:string;
  choices?:Array<{message?:{content?:string}}>;
  usage?:{prompt_tokens?:number;completion_tokens?:number};
}

export class OpenAICompatibleAIProvider implements AIProvider{
  readonly id:string;
  private readonly baseUrl:string;
  constructor(private readonly config:HttpAIProviderConfig){
    this.id=config.id;
    this.baseUrl=config.baseUrl.replace(/\/$/,"");
  }
  async complete(request:LLMRequest):Promise<LLMResponse>{
    const response=await fetch(this.baseUrl+(this.config.path??"/v1/chat/completions"),{
      method:"POST",
      headers:{
        accept:"application/json",
        "content-type":"application/json",
        ...(this.config.token?{authorization:"Bearer "+this.config.token}:{})
      },
      body:JSON.stringify({
        model:this.config.model,
        messages:[
          {role:"system",content:request.system},
          {role:"user",content:request.prompt}
        ],
        ...(request.temperature===undefined?{}:{temperature:request.temperature})
      })
    });
    if(!response.ok)throw new Error("AI provider failed: "+response.status);
    const data=await response.json() as ChatResponse;
    const output=data.choices?.[0]?.message?.content;
    if(typeof output!=="string")throw new Error("AI provider returned no textual output");
    return{
      output,
      model:data.model??this.config.model,
      ...(data.usage?{usage:{inputTokens:data.usage.prompt_tokens??0,outputTokens:data.usage.completion_tokens??0}}:{})
    };
  }
}
