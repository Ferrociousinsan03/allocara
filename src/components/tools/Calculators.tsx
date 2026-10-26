import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { projectSavings, capitalGains, retirement, earlyWithdrawal } from '@/engine/tools';
import { formatINR, formatPct } from '@/engine/format';
import { useAnalyser } from '@/components/analyser/state';
import { listPortfolios } from '@/engine/investor';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
export function NumberField({ label, value, change, min = 0, max = 1e12, step = 'any' }: {label:string;value:string;change:(v:string)=>void;min?:number;max?:number;step?:string}) {
 return <label className="block text-sm text-muted-foreground">{label}<Input type="number" className="mt-2" value={value} min={min} max={max} step={step} required onChange={e=>change(e.target.value)} /></label>;
}
export function Result({label,value}:{label:string;value:string}) { return <div className="border-l-2 border-primary pl-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 break-words font-serif text-2xl num">{value}</p></div>; }
export function ProjectionChart({rows}:{rows:ReturnType<typeof projectSavings>['rows']}) {
 return <div className="mt-8 h-72 w-full min-w-0" aria-label="Projected contributions and growth"><ResponsiveContainer width="100%" height="100%"><AreaChart data={rows}><XAxis dataKey="year"/><YAxis tickFormatter={v=>formatINR(Number(v))} width={95}/><Tooltip formatter={v=>formatINR(Number(v))}/><Legend/><Area isAnimationActive={false} dataKey="contributed" name="Contributions" stackId="total" stroke="var(--ivory-dim)" fill="var(--line)"/><Area isAnimationActive={false} dataKey="growth" name="Growth" stackId="total" stroke="var(--emerald)" fill="var(--emerald-deep)"/></AreaChart></ResponsiveContainer></div>;
}
export function Calculators({id}:{id:string}) {
 const {state}=useAnalyser();
 const [values,setValues]=useState<Record<string,string>>({});
 const n=(key:string)=>Number(values[key]??0);
 const field=(key:string,label:string,max=1e12,min=0)=> <NumberField key={key} label={label} value={values[key]??''} change={v=>setValues(s=>({...s,[key]:v}))} max={max} min={min}/>;
 let fields:React.ReactNode[]=[]; let output:React.ReactNode=null;
 const complete=(keys:string[])=>keys.every(k=>values[k]!==undefined&&values[k]!==''&&Number.isFinite(n(k))&&n(k)>=0)&&Object.values(values).every(v=>v!==''&&Number.isFinite(Number(v)));
 if (id==='capital-gains') {
  fields=[field('sale','Sale proceeds (₹)'),field('cost','Acquisition cost (₹)'),field('expenses','Allowable expenses (₹)'),field('exemption','Exemption to apply (₹)'),field('tax','Effective tax rate (%)',100)];
  if(complete(['sale','cost','expenses','exemption','tax'])&&n('tax')<=100) {const r=capitalGains(n('sale'),n('cost'),n('expenses'),n('exemption'),n('tax')/100); output=<><Result label="Gain / loss" value={formatINR(r.gain)}/><Result label="Taxable gain" value={formatINR(r.taxable)}/><Result label="Estimated tax" value={formatINR(r.tax)}/></>;}
 } else if (id==='withdrawal') {
  fields=[field('principal','Principal (₹)'),field('months','Months held',600),field('original','Contract interest (%)',100),field('rateA','Option A exit interest (%)',100),field('penaltyA','Option A fee (₹)'),field('rateB','Option B exit interest (%)',100),field('penaltyB','Option B fee (₹)')];
  if(complete(['principal','months','original','rateA','penaltyA','rateB','penaltyB'])&&n('months')<=600&&['original','rateA','rateB'].every(k=>n(k)<=100)) {const a=earlyWithdrawal(n('principal'),n('months'),n('original')/100,n('rateA')/100,n('penaltyA'));const b=earlyWithdrawal(n('principal'),n('months'),n('original')/100,n('rateB')/100,n('penaltyB'));output=<><Result label="A: cash on exit" value={formatINR(a.early)}/><Result label="A: interest lost + fees" value={formatINR(a.cost)}/><Result label="B: cash on exit" value={formatINR(b.early)}/><Result label="B: interest lost + fees" value={formatINR(b.cost)}/></>;}
 } else {
  fields=[field('initial','Starting savings (₹)'),field('monthly','Monthly contribution (₹)'),field('years','Years',60,1),field('return','Assumed annual return (%)',100)];
  if(id==='step-up') fields.push(field('step','Annual contribution increase (%)',100));
  if(id==='fees') fields.push(field('fee','Annual fund fee (%)',100));
  if(id==='retirement') fields.push(field('expenses','Current monthly expenses (₹)'),field('inflation','Annual inflation (%)',100),field('withdrawal','Annual withdrawal rate (%)',100,.1));
  const required=['initial','monthly','years','return',...(id==='step-up'?['step']:id==='fees'?['fee']:id==='retirement'?['expenses','inflation','withdrawal']:[])];
  if(complete(required)&&n('years')>=1&&n('years')<=60&&Number.isInteger(n('years'))&&n('return')<=100&&n('step')<=100&& (id!=='fees'||(n('fee')<=100&&1+n('return')/100-n('fee')/100>0))&&(id!=='retirement'||(n('withdrawal')>0&&n('withdrawal')<=100&&n('inflation')<=100))) {
   const r=projectSavings(n('initial'),n('monthly'),n('years'),n('return')/100,id==='step-up'?n('step')/100:0,id==='fees'?n('fee')/100:0);
   if(id==='retirement') {const t=retirement(n('expenses'),n('years'),n('inflation')/100,n('withdrawal')/100,n('initial'),n('monthly'),n('return')/100);output=<><Result label="Target corpus" value={formatINR(t.target)}/><Result label="Projected savings" value={formatINR(t.projected)}/><Result label="Shortfall" value={formatINR(t.gap)}/><Result label="Target coverage" value={t.coverage===null?'No expenses entered':formatPct(t.coverage)}/></>;}
   else output=<><Result label="Total contributions" value={formatINR(r.contributed)}/><Result label="Projected value" value={formatINR(r.value)}/><Result label="Projected growth" value={formatINR(r.growth)}/>{id==='fees'&&<Result label="Value lost to fees" value={formatINR(projectSavings(n('initial'),n('monthly'),n('years'),n('return')/100).value-r.value)}/>}<div className="col-span-full"><ProjectionChart rows={r.rows}/></div></>;
  }
 }
 // Missing optional step-up fields must not invalidate other calculators.
 const portfolios=listPortfolios(state);const cost=portfolios.flatMap(p=>p.holdings).reduce((s,h)=>s+h.investedAmount,0);const value=portfolios.flatMap(p=>p.holdings).reduce((s,h)=>s+h.currentValue,0);
 return <div><p className="text-sm text-careful">User-input scenario · not a forecast{ id==='capital-gains'?' or a tax filing calculation. Rates, exemptions, cess and offsets must be verified for your asset and sale date.':'.'}</p>{id==='progress'&&<div className="mt-6 grid gap-6 sm:grid-cols-3"><Result label="Recorded cost basis" value={formatINR(cost)}/><Result label="Recorded holdings value" value={formatINR(value)}/><Result label="Unrealised difference" value={formatINR(value-cost)}/></div>}<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{fields}</div><p className="mt-4 text-xs text-muted-foreground">Annual effective returns; contributions at month-end; yearly step-ups. Fees reduce the annual return. Withdrawal comparison uses simple interest. Retirement uses a constant withdrawal-rate assumption, not a guarantee.</p><div aria-live="polite" className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{output??<p className="col-span-full text-muted-foreground">Enter valid values in every field to calculate.</p>}</div></div>;
}
