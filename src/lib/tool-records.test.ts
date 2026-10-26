import { it,expect } from 'vitest';
import { readRecord,recordTotal,type ToolRecord } from './tool-records';
const row:ToolRecord={name:'Own input',date:'2026-10-25',notes:'',source:'',symbol:'',amount:100,units:2,price:60,status:'Received',action:''};
it('only received dividends count as received income',()=>expect(recordTotal('dividends',[row,{...row,status:'Expected'}])).toBe(100));
it('practice mark value is units times the entered price',()=>expect(recordTotal('sandbox',[row])).toBe(120));
it('rejects negative amounts and invalid record dates',()=>{expect(readRecord({...row,amount:-1})).toBeNull();expect(readRecord({...row,date:'2026-02-30'})).toBeNull();});
