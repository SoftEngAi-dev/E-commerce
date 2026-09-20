import{quotePrice}from"../domain/pricing.js";import{transitionOrder,type OrderState}from"../domain/order.js";import{reserveStock,type StockItem}from"./inventory.js";
export interface CheckoutLine{sku:string;unitCost:number;shippingCost:number;quantity:number}
export interface CheckoutInput{orderId:string;currency:string;lines:CheckoutLine[];feeRate:number;targetMarginRate:number}
export interface CheckoutResult{orderId:string;total:number;marginRate:number;state:OrderState;reservations:StockItem[]}
export function buildCheckout(i:CheckoutInput,stock:StockItem[]):CheckoutResult{
 if(!i.lines.length)throw new Error("Cart is empty");
 let total=0;let marginNumerator=0;const reservations:StockItem[]=[];
 for(const line of i.lines){if(!Number.isInteger(line.quantity)||line.quantity<=0)throw new Error("Invalid quantity");const st=stock.find(s=>s.sku===line.sku);if(!st)throw new Error("SKU not found: "+line.sku);const q=quotePrice({supplierCost:line.unitCost,shippingCost:line.shippingCost,feeRate:i.feeRate,targetMarginRate:i.targetMarginRate});total+=q.price*line.quantity;marginNumerator+=q.grossMargin*line.quantity;reservations.push(reserveStock(st,line.quantity))}
 return{orderId:i.orderId,total,marginRate:marginNumerator/total,state:transitionOrder("pending_payment","paid"),reservations}
}
