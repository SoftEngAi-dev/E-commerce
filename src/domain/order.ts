export const ORDER_STATES=["pending_payment","paid","submitted","shipped","delivered","cancelled","refunded","expired"] as const;
export type OrderState=(typeof ORDER_STATES)[number];
const transitions:Record<OrderState,readonly OrderState[]>={pending_payment:["paid","cancelled","expired"],paid:["submitted","refunded"],submitted:["shipped","refunded"],shipped:["delivered","refunded"],delivered:["refunded"],cancelled:[],refunded:[],expired:[]};
export function canTransition(from:OrderState,to:OrderState){return transitions[from].includes(to)}
export function transitionOrder(from:OrderState,to:OrderState):OrderState{if(!canTransition(from,to))throw new Error("Invalid order transition: "+from+" -> "+to);return to}
