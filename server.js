const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {load,readCsv,validate,detect,evaluate}=require('./src/analysis');
const ROOT=__dirname,DATA=path.join(ROOT,'data','generated'),WEB=path.join(ROOT,'web');
const types={'claims':'claim_id','claimants':'claimant_id','policies':'policy_id','incidents':'incident_id','providers':'provider_id','invoices':'invoice_record_id','payments':'payment_id','relationship_edges':'edge_id','fraud_indicators':'indicator_id','investigations':'investigation_id'};
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);}
function records(){return load(DATA);}
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try{
    if(req.method==='GET'&&url.pathname==='/api/summary'){
      const t=records(),ranked=detect(t),validation=validate(t),truth=JSON.parse(fs.readFileSync(path.join(DATA,'ground_truth.json'),'utf8'));
      const metrics=evaluate(ranked,truth),counts=Object.fromEntries(Object.entries(t).map(([k,v])=>[k,v.length]));
      return send(res,200,{counts,metrics,validation:{valid:validation.valid,errors:validation.errors,warnings:validation.warnings},decisions:{investigate:ranked.filter(x=>x.decision==='investigate').length,review:ranked.filter(x=>x.decision==='review').length,no_alert:ranked.filter(x=>x.decision==='no_alert').length},seed:JSON.parse(fs.readFileSync(path.join(DATA,'manifest.json'),'utf8')).seed});
    }
    if(req.method==='GET'&&url.pathname==='/api/claims'){
      const t=records(),ranked=detect(t),claims=new Map(t.claims.map(x=>[x.claim_id,x])),claimants=new Map(t.claimants.map(x=>[x.claimant_id,x])),incidents=new Map(t.incidents.map(x=>[x.incident_id,x]));
      const output=ranked.map(r=>{const c=claims.get(r.claim_id),who=claimants.get(c.claimant_id),incident=incidents.get(c.incident_id);return{...r,status:c.status,claimed_amount:Number(c.claimed_amount),approved_amount:Number(c.approved_amount),filed_at:c.filed_at,incident_type:incident.incident_type,narrative:incident.narrative,claimant_name:who.name,claimant_email:who.email,claimant_phone:who.phone};});
      const search=(url.searchParams.get('q')||'').toLowerCase(),decision=url.searchParams.get('decision')||'all';
      return send(res,200,output.filter(x=>(decision==='all'||x.decision===decision)&&(!search||`${x.claim_id} ${x.claimant_id} ${x.claimant_name} ${x.incident_type}`.toLowerCase().includes(search))).slice(0,250));
    }
    if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{status:'ok'});
    const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)),file=path.resolve(WEB,rel);
    if(!file.startsWith(path.resolve(WEB)+path.sep)&&file!==path.join(path.resolve(WEB),'index.html'))return send(res,403,{error:'forbidden'});
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:'not found'});
    const ext=path.extname(file),mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'}[ext]||'application/octet-stream';
    return send(res,200,fs.readFileSync(file),mime);
  }catch(error){return send(res,500,{error:'Unable to load generated dataset',detail:error.message});}
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`YottaFlex investigator running at http://127.0.0.1:${port}`));
