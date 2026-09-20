import type { AIProvider } from "../ai/provider.js";

export async function generateProductCopy(provider:AIProvider,input:{title:string;description?:string;category?:string;market:string;language:string}){
  return provider.complete({
    system:"You write compliant e-commerce product copy. Never invent specifications, certifications, health effects, guarantees or supplier claims.",
    prompt:"Create a product title, short description and 5 factual selling points from only this source data: "+JSON.stringify(input),
    temperature:0.2
  });
}
