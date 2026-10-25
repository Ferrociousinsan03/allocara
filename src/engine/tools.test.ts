import { describe, it, expect } from 'vitest';
import { projectSavings, capitalGains, retirement, earlyWithdrawal, parseNav, rollingReturns, companyMetrics } from './tools';
describe('user-input investment tools', () => {
 it('applies annual SIP step-up only after year one', () => { const r = projectSavings(0, 1000, 2, 0, .1); expect(r.contributed).toBe(25200); expect(r.value).toBe(25200); });
 it('separates contributions and growth', () => { const r = projectSavings(10000, 0, 1, .1); expect(r.value).toBeCloseTo(11000); expect(r.growth).toBeCloseTo(1000); });
 it('fees reduce annual net returns', () => { expect(projectSavings(10000, 0, 1, .1, 0, .02).value).toBeCloseTo(10800); });
 it('taxes only gains above user-entered exemption', () => { expect(capitalGains(200000, 100000, 10000, 25000, .2)).toEqual({ gain:90000, taxable:65000, tax:13000, netProceeds:177000 }); });
 it('does not tax a capital loss', () => expect(capitalGains(50, 100, 0, 0, .2).tax).toBe(0));
 it('inflates retirement expenses before corpus calculation', () => { const r = retirement(10000, 1, .1, .04, 0, 0, 0); expect(r.target).toBeCloseTo(3300000); });
 it('does not show infinite retirement coverage for zero expenses', () => expect(retirement(0,1,.05,.04,100,0,0).coverage).toBeNull());
 it('deducts a rupee withdrawal penalty', () => expect(earlyWithdrawal(10000, 12, .08, .06, 100).cost).toBeCloseTo(300));
 it('rejects invalid and duplicate NAV observations', () => { expect(() => parseNav('date,nav\n2025-02-30,10\n2026-01-01,12')).toThrow(); expect(() => parseNav('date,nav\n2025-01-01,10\n2025-01-01,12')).toThrow(); });
 it('annualises dated NAV returns', () => { expect(rollingReturns(parseNav('date,nav\n2025-01-01,100\n2026-01-01,110'), 1)[0]?.annualReturn).toBeCloseTo(.1, 3); });
 it('does not invent financial ratios without denominators', () => expect(companyMetrics(0,0,0,0,0,0,0,0).margin).toBeNull());
});
