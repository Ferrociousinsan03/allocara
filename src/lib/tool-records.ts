import { z } from 'zod';
export const recordSchema = z.object({ name:z.string().trim().min(1).max(200), date:z.string().refine(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v), notes:z.string().max(5000), source:z.string().max(500), symbol:z.string().max(80), amount:z.number().finite().nonnegative(), units:z.number().finite().nonnegative(), price:z.number().finite().nonnegative(), status:z.string().max(100), action:z.string().max(100) });
export type ToolRecord = z.infer<typeof recordSchema>;
export function readRecord(payload:unknown):ToolRecord|null { const parsed=recordSchema.safeParse(payload);return parsed.success?parsed.data:null; }
export function recordTotal(kind:string, rows:ToolRecord[]) {
 if(kind==='dividends')return rows.filter(r=>r.status==='Received').reduce((s,r)=>s+r.amount,0);
 if(kind==='sandbox')return rows.reduce((s,r)=>s+r.units*r.price,0);
 return rows.reduce((s,r)=>s+r.amount,0);
}
