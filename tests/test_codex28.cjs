// Regression acceptance checks for 2040720. Synthetic data, network blocked.
// These checks intentionally fail until the reported defects are corrected.
// Run from repository root: node tests/test_codex28.cjs
// Requires playwright; CHROME_PATH optionally selects installed Chrome.
// (28/09, Claude) Two changes only, so tests/correr.sh can read it: a final "N bien · N mal" line, and the JSON
// goes to CODEX28_OUT or the temp folder instead of the repository root. The checks themselves are Codex's, untouched.
const fs=require('fs'),path=require('path'),vm=require('vm'),os=require('os');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const results=[];
function check(name,pass,actual){results.push({name,pass,actual});console.log(`${pass?'PASS':'FAIL'} ${name}: ${JSON.stringify(actual)}`);}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
 try{
  const page=await browser.newPage({timezoneId:'America/La_Paz'});
  await page.route(/^https?:/,r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-09-23T15:00:00-04:00'));
  await page.goto(pathToFileURL(path.resolve(process.env.PEDIDOS||'pedidos.html')).href);
  const fixture=fs.readFileSync('tests/test_saldo_almacen.js','utf8').match(/function PREPARAR\(\)\{[\s\S]*?\n\}/)[0];
  await page.evaluate(`(${fixture})()`);
  const stock=await page.evaluate(async()=>{
   await _escenario(_stock({aca:{TIT:0},im:{TIT:5},p:[{id:'pickup',k:K.TIT,u:5,tipo:'recogida',de:IMN,f:todayStr(),esp:'2026-10-05'}]}),[]);
   const v=saldoVeredicto(K.TIT,1,'','2026-09-25',true);
   return {v,title:saldoTitulo(v),incoming:stockData().lista.find(o=>o.k===K.TIT).pedidos};
  });
  check('Scheduled pickup must not promise delivery before its expected arrival',stock.v.desde>='2026-10-05',stock);
  check('Pickup units are not counted twice in this fixture',stock.v.alm===5 && stock.v.moreno===0 && stock.v.recogida===5,{total:stock.v.alm,moreno:stock.v.moreno,pickup:stock.v.recogida});
  const closed=await page.evaluate(async()=>{
   await _escenario(_stock({aca:{TIT:5}}),[]);
   const start=proximoDiaEntrega();
   DIAS_CERRADOS=Array.from({length:65},(_,i)=>stockSumarDias(start,i));
   const v=saldoVeredicto(K.TIT,1,'',start,true);
   return {v,title:saldoTitulo(v),closed:diaCerrado(v.desde)};
  });
  check('No delivery capacity must not produce a closed date as available',!closed.closed,closed);
  const newer=await page.evaluate(()=>{
   const old={id:'recent',rev:10,cliente:'OLD',productos:[],fecha:'2026-10-06'};
   STATE=[old]; SAVE_ULTIMO={recent:{rec:old,t:Date.now()}}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
   localStorage.removeItem(LS_PEND);
   return mergePending([{...old,rev:11,cliente:'NEW FROM OTHER DEVICE'}]).map(x=>({rev:x.rev,cliente:x.cliente}));
  });
  check('A completed local save must not hide a newer server revision',newer[0]?.rev===11,newer);
  const stale=await page.evaluate(()=>mergePending([{...STATE[0],rev:9,cliente:'STALE SNAPSHOT'}]));
  check('Control: genuinely older server revision must not undo a recent local save',stale[0]?.rev===10,{rev:stale[0]?.rev});
  const expired=await page.evaluate(()=>{SAVE_ULTIMO.recent.t=Date.now()-91000; return mergePending([{...STATE[0],rev:11,cliente:'NEW FROM OTHER DEVICE'}]);});
  check('Control: newer revision becomes visible after the 90 second protection',expired[0]?.rev===11,{rev:expired[0]?.rev});
  // Exercise the real Apps Script in its existing synthetic Sheets harness.
  const serverTest=fs.readFileSync('tests/test_rev6_plata_form.js','utf8');
  const helpers=serverTest.slice(serverTest.indexOf('function hacerPlanilla('),serverTest.indexOf('/* Una venta sintética'));
  const srv=vm.runInNewContext(helpers+'\nservidor()', {fs,vm,console,Date,GS:path.resolve('google-apps-script.gs')});
  const save=srv.guardar({id:'deleted-remote',cliente:'SYNTHETIC',fecha:'2026-10-06',turno:'AM',productos:[],vendedor:'Maria Flores'});
  if(!save.ok) throw new Error('Fixture save failed: '+JSON.stringify(save));
  const original=JSON.parse(JSON.stringify(srv.fila('deleted-remote')));
  const del=JSON.parse(srv.post(JSON.stringify({action:'delete',id:original.id,rev:original.rev})));
  if(!del.ok) throw new Error('Fixture delete failed: '+JSON.stringify(del));
  const retained=await page.evaluate(rec=>{
   STATE=[rec];SAVE_ULTIMO={[rec.id]:{rec,t:Date.now()}};SAVE_EN_VUELO={};SAVE_EN_ESPERA={};
   localStorage.removeItem(LS_PEND);
   return mergePending([]);
  },original);
  check('A fresh server deletion must be distinguishable from a stale empty snapshot',retained.length===0,{retained:retained.map(x=>x.id)});
  const resaved=retained[0] ? srv.guardar({...retained[0],observaciones:'Edited from retained local copy'}) : null;
  check('Saving the retained revision must not recreate a remotely deleted order',!srv.fila(original.id),{accepted:resaved?.ok,recreated:!!srv.fila(original.id)});
 }finally{await browser.close();}
 fs.writeFileSync(process.env.CODEX28_OUT||path.join(os.tmpdir(),'codex28-results.json'),JSON.stringify(results,null,2));
 console.log(results.filter(x=>x.pass).length+' bien · '+results.filter(x=>!x.pass).length+' mal');
 process.exitCode=results.some(x=>!x.pass)?1:0;
})().catch(e=>{console.error(e);process.exitCode=2;});
