const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SEED = 20261022;
const FULL = { claimants: 2000, policies: 2200, claims: 5000, incidents: 5000, providers: 500, relationship_edges: 8000 };
const STARTER = { claimants: 120, policies: 132, claims: 300, incidents: 300, providers: 35, relationship_edges: 480 };
const INCIDENT_TYPES = ['collision','water_damage','theft','fire','hail','injury'];
const NARRATIVES = ['Rear impact at intersection during commute','Water leak discovered after heavy rain','Vehicle missing from shared parking area','Smoke damage reported after electrical fault','Hail damage noted across roof and hood','Slip injury reported at retail entrance','Side impact while changing lanes','Pipe failure caused kitchen flooding','Vehicle window broken overnight','Small appliance fire in utility room'];

function rng(seed = SEED) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function choice(r, xs) { return xs[Math.floor(r() * xs.length)]; }
function int(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
function date(offset) { return new Date(Date.UTC(2025,0,1) + offset * 86400000).toISOString().slice(0,10); }
function addDays(value, days) { return new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0,10); }
function money(n) { return Math.round(n * 100) / 100; }
function id(prefix, n, year = false) { return `${prefix}-${year ? '2026-' : ''}${String(n).padStart(6,'0')}`; }
function writeCsv(file, rows) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const esc = v => { if (v === null || v === undefined) return ''; const s = String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; };
  fs.writeFileSync(file, `${cols.join(',')}\n${rows.map(r => cols.map(k => esc(r[k])).join(',')).join('\n')}\n`, 'utf8');
}
function generate({ outDir = 'data/generated', scale = 'full', seed = SEED } = {}) {
  const counts = scale === 'starter' ? STARTER : scale === 'full' ? FULL : scale;
  const r = rng(seed); fs.mkdirSync(outDir, { recursive: true });
  // Reserve deterministic room for documented negative cases while retaining requested baseline volume.
  const claimants = Array.from({length:counts.claimants},(_,i)=>({claimant_id:id('CUS',i+1,true), name:`Person ${String(i+1).padStart(5,'0')}`, email:`person${i+1}@example.test`, phone:`555-${String(1000000+i).slice(-7)}`, address:`${100+Math.floor(i/2)} Sample Street`, created_at:date(int(r,0,800))}));
  const policies = Array.from({length:counts.policies},(_,i)=>({policy_id:id('POL',i+1,true), claimant_id:claimants[i%claimants.length].claimant_id, policy_type:choice(r,['auto','home','health']), effective_from:'2024-01-01', effective_to:'2027-12-31', lifecycle_state:'active', coverage_limit:money(int(r,10000,150000))}));
  const providers = Array.from({length:counts.providers},(_,i)=>({provider_id:id('PRV',i+1), name:`Provider ${String(i+1).padStart(4,'0')}`, provider_type:choice(r,['repairer','medical','tow','property_restoration']), tax_id:`SYN-${String(i+1).padStart(8,'0')}`, address:`${500+i} Service Road, District ${i%40+1}`, created_at:'2024-01-01'}));
  const incidents=[], claims=[], invoices=[], payments=[], edges=[], indicators=[], investigations=[], claim_state_events=[], payment_state_events=[], truth=[];
  for(let i=0;i<counts.incidents;i++) { const occurred=int(r,20,900); incidents.push({incident_id:id('INC',i+1,true),incident_type:choice(r,INCIDENT_TYPES),occurred_at:date(occurred),reported_at:date(occurred+(i===counts.incidents-1?90:int(r,0,20))),location:`District ${int(r,1,40)}`,narrative:choice(r,NARRATIVES)}); }
  const invoiceSeq=new Map();
  for(let i=0;i<counts.claims;i++) {
    const planted=i<Math.max(2,Math.floor(counts.claims*.02));
    let claimantIndex=planted ? i%Math.max(2,Math.floor(counts.claimants*.02)) : int(r,0,counts.claimants-1);
    if(i===counts.claims-4&&claimantIndex===0)claimantIndex=Math.min(counts.claimants-1,Math.max(2,Math.floor(counts.claimants*.02))+5);
    const claimant=claimants[claimantIndex], policy=policies.find(p=>p.claimant_id===claimant.claimant_id);
    const incident=incidents[i%incidents.length];
    const filed=incident.reported_at, approved=money(Math.min(int(r,300,18000),policy.coverage_limit));
    const isInvalidPolicy=i===counts.claims-5;
    const overpay=i===counts.claims-3, claimed=overpay?money(approved*.95):money(approved*(0.8+r()*.7));
    const decisionState=isInvalidPolicy?'under_review':claimed>approved*1.25?'denied':claimed>approved?'partially_approved':'approved';
    const claim={claim_id:id('CLM',i+1,true), claimant_id:claimant.claimant_id, policy_id:isInvalidPolicy?'POL-DOES-NOT-EXIST':policy.policy_id, incident_id:incident.incident_id, filed_at:filed, status:decisionState, claimed_amount:claimed, approved_amount:approved, currency:'USD'};
    claims.push(claim);
    const provider=providers[(i*7)%providers.length];
    const seq=(invoiceSeq.get(provider.provider_id)||0)+1;invoiceSeq.set(provider.provider_id,seq);
    const invoiceId=`INV-PRV-${provider.provider_id}-${String(seq).padStart(6,'0')}`;
    const duplicate=i===counts.claims-4;
    const storedInvoiceId=duplicate && invoices.length ? invoices[0].invoice_id : invoiceId;
    const invoiceRecordId=id('INV',i+1,true),issuedAt=addDays(filed,int(r,0,30));
    invoices.push({invoice_record_id:invoiceRecordId,invoice_id:storedInvoiceId, provider_id:provider.provider_id, claim_id:id('CLM',i+1,true), issued_at:issuedAt, amount:money(approved*(0.15+r()*.55)), currency:'USD', lifecycle_state:'submitted'});
    if(['approved','partially_approved'].includes(decisionState)||overpay){
      const paidAt=addDays(issuedAt,int(r,1,30)),fullSettlement=!overpay&&r()<.35,amount=overpay?money(approved+250):fullSettlement?approved:Math.min(approved,money(approved*(.2+r()*.7)));
      payments.push({payment_id:id('PAY',i+1,true),claim_id:id('CLM',i+1,true),invoice_record_id:invoiceRecordId,paid_at:paidAt,amount,currency:'USD',status:'settled'});
      payment_state_events.push({event_id:id('PEVT',i+1,true),payment_id:id('PAY',i+1,true),prior_state:'pending',next_state:'settled',occurred_at:`${paidAt}T12:00:00Z`,actor:'synthetic_workflow',reason:'Payment event settled'});
    }
    const payment=payments.find(p=>p.claim_id===claim.claim_id);
    if(payment&&Number(payment.amount)===Number(claim.approved_amount))claim.status='paid';
    claim_state_events.push({event_id:id('CEVT',i+1,true),claim_id:claim.claim_id,prior_state:decisionState==='submitted'?'':decisionState,next_state:claim.status,occurred_at:`${filed}T12:00:00Z`,actor:'synthetic_workflow',reason:`Derived from policy reference, claimed-to-approved ratio, and settled payment total (${decisionState} decision)`});
  }
  // 8,000 (or scaled) relationship rows. Benign same-address links are explicit and labelled benign.
  for(let i=0;i<counts.relationship_edges;i++) {
    const clusterSize=Math.max(2,Math.floor(counts.claimants*.02));
    const benign=i%5===0;
    let a,b;
    if(benign){a=Math.min(counts.claimants-2,clusterSize+2+2*Math.floor((i/5)%(Math.floor((counts.claimants-clusterSize-2)/2))));b=a+1;}
    else {a=int(r,0,claimants.length-1);b=(a+1+int(r,0,Math.min(15,claimants.length-2)))%claimants.length;if(a<clusterSize&&b<clusterSize)b=clusterSize+((b+1)%Math.max(1,claimants.length-clusterSize));}
    edges.push({edge_id:id('EDGE',i+1,true),source_type:'claimant',source_id:claimants[a].claimant_id,target_type:'claimant',target_id:claimants[b].claimant_id,relationship_type:benign ? 'same_address' : choice(r,['referral','known_household']),confidence:benign ? .55 : .7,effective_from:date(int(r,0,700)),effective_to:'',source:'synthetic_generator'});
  }
  // Intentionally omitted planted link: claims in the cluster share contact values, without a direct edge.
  const omitted=Math.min(Math.max(2,Math.floor(counts.claimants*.02)),claims.length-2);
  if(omitted>0) { const c=claimants[0]; for(let i=0;i<omitted;i++){ claimants[i].email=c.email; claimants[i].phone=c.phone; }
    truth.push({subject_type:'claimant',subject_id:claimants[0].claimant_id,label:'unrepresented_relationship',reason:'Shared synthetic contact intentionally omitted from edge table',expected_decision:'investigate'}); }
  const plantedClaimants=new Set(claimants.slice(0,omitted).map(c=>c.claimant_id));
  for(const c of claims) if(plantedClaimants.has(c.claimant_id)) truth.push({subject_type:'claim',subject_id:c.claim_id,label:'planted_network',reason:'Claim belongs to a controlled shared-contact cluster',expected_decision:'investigate'});
  if(claimants.length>omitted+1){truth.push({subject_type:'claimant',subject_id:claimants[omitted].claimant_id,label:'benign_shared_address',reason:'Shares a common household address; address alone is not evidence of wrongdoing',expected_decision:'no_alert'});truth.push({subject_type:'claimant',subject_id:claimants[omitted+1].claimant_id,label:'benign_shared_address',reason:'Shares a common household address; address alone is not evidence of wrongdoing',expected_decision:'no_alert'});}
  // Repeat narratives are a weak signal. The household repeat is explicitly benign and excluded from positive labels.
  if(claims.length>10) { incidents[1].narrative=incidents[0].narrative; truth.push({subject_type:'incident',subject_id:incidents[1].incident_id,label:'benign_repeat_narrative',reason:'Benign repeat narrative included to test false positives',expected_decision:'review_context'}); }
  // Use coherent incident and filing ordering, keeping explicit exception records in the ground truth.
  const anomalies=[
    [claims.at(-5),'invalid_policy_reference','Claim references nonexistent policy; exception row retained for validation coverage'],
    [claims.at(-3),'payment_exceeds_approved','Payment amount exceeds source approved amount'],
    [claims.at(-4),'duplicate_invoice_across_claimants','Invoice ID deliberately reused across unrelated claimant claims'],
  ];
  for(const [c,label,reason] of anomalies) truth.push({subject_type:'claim',subject_id:c.claim_id,label,reason,expected_decision:'exception'});
  const indicatorRules={invalid_policy_reference:['missing_policy_reference','high','Policy reference has no matching policy'],payment_exceeds_approved:['payment_over_approval','high','Settled payment exceeds approved claim amount'],duplicate_invoice_across_claimants:['duplicate_invoice','high','Invoice number is reused across claims'],planted_network:['shared_contact_cluster','medium','Contact pair shared across multiple claimants'],unusual_reporting_delay:['late_reporting','medium','Incident reported more than 30 days after occurrence']};
  const triageClaims=new Map();
  for(const row of truth)if(row.subject_type==='claim'&&indicatorRules[row.label]){const rule=indicatorRules[row.label],claim=claims.find(c=>c.claim_id===row.subject_id);indicators.push({indicator_id:id('IND',indicators.length+1,true),claim_id:row.subject_id,indicator_type:rule[0],severity:rule[1],evidence:rule[2],created_at:claim.filed_at});if(row.expected_decision==='investigate')triageClaims.set(row.subject_id,row);}
  for(const [claimId,row] of triageClaims){const claim=claims.find(c=>c.claim_id===claimId);investigations.push({investigation_id:id('INVG',investigations.length+1,true),claim_id:claimId,assigned_role:'risk_compliance_reviewer',status:'open',priority:row.label==='planted_network'?'medium':'high',opened_at:claim.filed_at,closed_at:'',outcome:''});}
  const claim_providers=invoices.map(inv=>({claim_id:inv.claim_id,provider_id:inv.provider_id,service_role:providers.find(p=>p.provider_id===inv.provider_id).provider_type,effective_from:inv.issued_at,effective_to:''}));
  for(const c of claims) if(c.incident_id===incidents.at(-1).incident_id)truth.push({subject_type:'claim',subject_id:c.claim_id,label:'unusual_reporting_delay',reason:'Incident reported 90 days after occurrence',expected_decision:'investigate'});
  const tables={claimants,policies,claims,incidents,providers,invoices,payments,claim_providers,relationship_edges:edges,fraud_indicators:indicators,investigations,claim_state_events,payment_state_events};
  for(const [name,rows] of Object.entries(tables)) writeCsv(path.join(outDir,`${name}.csv`),rows);
  writeCsv(path.join(outDir,'ground_truth.csv'),truth);
  fs.writeFileSync(path.join(outDir,'ground_truth.json'),JSON.stringify(truth,null,2));
  const sqlValue=v=>v===null||v===undefined?'NULL':typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`;
  let sql='-- Synthetic seed export. Ground truth is intentionally excluded.\n';
  const sqlOrder=['claimants','policies','incidents','providers','claims','invoices','payments','claim_providers','relationship_edges','fraud_indicators','investigations','claim_state_events','payment_state_events'];
  for(const name of sqlOrder) for(const row of tables[name]){const cols=Object.keys(row);sql+=`INSERT INTO ${name} (${cols.join(',')}) VALUES (${cols.map(k=>sqlValue(row[k])).join(',')});\n`;}
  fs.writeFileSync(path.join(outDir,'seed.sql'),sql,'utf8');
  fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({generated_at:'2026-10-22T00:00:00Z',seed,scale,synthetic_only:true,counts:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.length])),sha256:Object.fromEntries(Object.keys(tables).map(k=>[`${k}.csv`,crypto.createHash('sha256').update(fs.readFileSync(path.join(outDir,`${k}.csv`))).digest('hex')]))},null,2));
  return {tables,truth,outDir};
}
module.exports={generate,FULL,STARTER,SEED,writeCsv};
