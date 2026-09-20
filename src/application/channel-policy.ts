export type Channel="store"|"marketplace"|"social";
export interface ChannelRule{enabled:boolean;requiresManualApproval:boolean;allowedMarkets:string[]}
export interface ChannelPolicy{channels:Record<Channel,ChannelRule>}
export function isChannelAllowed(policy:ChannelPolicy,channel:Channel,market:string){const r=policy.channels[channel];return r.enabled&&r.allowedMarkets.includes(market)}
export function requiresChannelApproval(policy:ChannelPolicy,channel:Channel){return policy.channels[channel].requiresManualApproval}
