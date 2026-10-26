import { createFileRoute,notFound,Link } from '@tanstack/react-router';
import { toolCatalog } from '@/lib/tool-catalog';
import { pageMeta } from '@/lib/metadata';
import { AnalyserProvider,useAnalyser } from '@/components/analyser/state';
import { useAccount } from '@/components/AccountProvider';
import { Button } from '@/components/ui/button';
import { Calculators } from '@/components/tools/Calculators';
import { CompanyResearch,FundReturns } from '@/components/tools/Research';
import { Records } from '@/components/tools/Records';
import { SourceRegister,MonthlyReport,DeleteData,PortfolioNews } from '@/components/tools/PortfolioUtilities';
export const Route=createFileRoute('/tools/$tool')({loader:({params})=>{const tool=toolCatalog.find(t=>t.id===params.tool);if(!tool)throw notFound();return tool;},head:({loaderData})=>({meta:pageMeta(`${loaderData?.name??'Investment tool'} — Allocara`,loaderData?.description??'Allocara investment planning and research tools.')}),component:ToolPage});
function ToolPage(){const {user,loading}=useAccount();return <AnalyserProvider key={loading?'checking':user?.id??'guest'}><ToolContent/></AnalyserProvider>;}
function ToolContent(){const tool=Route.useLoaderData();const {accountReady,retryLoad,saveStatus}=useAnalyser();const {loading}=useAccount();
 if(!accountReady||loading)return <div><p role="status">{saveStatus}</p><Button className="mt-4" variant="outline" onClick={retryLoad}>Retry</Button></div>;
 return <><h1 className="font-serif text-3xl sm:text-4xl">{tool.name}</h1><div className="mt-8 max-w-5xl">{tool.kind==='calculator'?<Calculators key={tool.id} id={tool.id}/>:tool.kind==='record'?<Records key={tool.id} kind={tool.id}/>:tool.kind==='company'?<CompanyResearch key={tool.id} compare={tool.id==='company-compare'}/>:tool.kind==='nav'?<FundReturns/>:tool.kind==='sources'?<SourceRegister/>:tool.kind==='report'?<MonthlyReport/>:tool.kind==='privacy'?<DeleteData/>:tool.kind==='news'?<PortfolioNews/>:<Button asChild><Link to="/account">Enter / edit my investments</Link></Button>}</div></>;}
