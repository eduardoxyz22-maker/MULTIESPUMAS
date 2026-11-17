/* 📥 PROYECCIÓN → «POR VENDEDOR»: LOS NÚMEROS DE KOMMO DE CADA VENDEDOR y 🙈 «OCULTAR» EN «QUIÉN NECESITA UNA MANO» (17/11/2026; dueño:
   «tenemos espacio para poner ahí KPIs, como leads, conversión…» y «falta el botón ocultar»).
   1. Sin la bandera (`PRY_KPI_PRUEBA`): ningún renglón nuevo.
   2. Con la bandera: debajo de cada vendedora, sus leads, cierres, conversión, tiempo de respuesta y % atendidos, tal cual el dashboard
      (`PANEL_DATA.team`); el nombre se cruza sin tildes («Carola Chávez» = «Carola Chavez»); Heaven y Sueña de su dashboard cada uno.
   3. Un dashboard de OTRO mes no se usa.
   4. «Quién necesita una mano»: «🙈 Ocultar» la pliega en un renglón, «👁 Mostrar» y el botón de arriba la abren; se recuerda en el aparato.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026 10:00 de Bolivia.   Se corre:  node tests/test_pry_kpi.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';
  var n=0;
  window.V=function(vend, fecha, prods, ts){ n++;
    var t=ts || (new Date(fecha+'T09:00:00-04:00').getTime()-3*86400000);
    var ps=prods.map(function(a){ return { desc:a[0], medida:a[1], cant:a[2], precio:a[3] }; });
    var bs=ps.reduce(function(s,x){ return s+x.cant*x.precio; }, 0);
    return { id:'p'+n, oc:fecha.slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'70000000', zona:'Norte', direccion:'Calle 1',
      fecha:fecha, turno:'AM', productos:ps, saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:t, rev:t, fotos:[] };
  };
  window.FIX=function(){ n=0; return [
    V('Carola Chavez','2026-11-05',[['COLCHON TITANIO ICE','160x190',2,5000],['ALMOHADA FIBRA','50x70',2,100]]),
    V('Carola Chavez','2026-11-06',[['COLCHON TITANIO LATEX','200x200',1,8000],['SOMIER TITANIO LATEX','200x200',1,2000]]),
    V('Isabel Robledo','2026-11-09',[['COLCHON CLOUD','105x190',3,900],['SABANAS','140x190',1,300]]),
    V('Isabel Robledo','2026-11-10',[['COLCHON ORO','140x190',1,3500]]),
    V('Maria Flores','2026-11-11',[['COLCHON SOFT','140x190',4,1000]]),
    V('Maria Flores','2026-10-20',[['COLCHON SOFT','140x190',9,1000]], new Date('2026-10-01T09:00:00-04:00').getTime()),   // octubre, temprano
    V('Carola Chavez','2026-10-15',[['COLCHON TITANIO ICE','160x190',1,5000]], new Date('2026-10-02T09:00:00-04:00').getTime()),
    V('Eduardo Añez','2026-11-12',[['COLCHON ORO','140x190',5,3000]])
  ]; };
  window.PINTAR=function(){ STATE=FIX(); UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(flag, mes){
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    await page.evaluate((o) => {
      if(o.flag) window.PRY_KPI_PRUEBA=1;
      window._pedidas=[];
      var dash=function(team){ return '<script>window.PANEL_DATA = '+JSON.stringify({ month:o.mes, year:2026, team:team })+';<\/script>'; };
      pubDashTraer=function(url){ window._pedidas.push(url);
        if(/VISCARRA/.test(url)) return Promise.resolve('<script>window.PANEL_DATA = '+JSON.stringify({ month:o.mes+' 2026', year:2026,   // Sueña: «Noviembre 2026»
          team:[{ name:'Maria Flores Charcas', leads:99, cierres:9, conv:9.1, promTxt:'5 min', respPct:100 }] })+';<\/script>');
        return Promise.resolve(dash([{ name:'Carola Chávez', leads:236, cierres:16, conv:6.8, promTxt:'3.1 h', respPct:92 },
                                     { name:'Isabel Robledo - Central', leads:253, cierres:21, conv:8.3, promTxt:'30 min', respPct:87 }])); };
    }, { flag, mes });
    page._ctx=ctx; return page;
  }
  const KPI=()=>[].map.call(document.querySelectorAll('#pry-vendedores .pry-fila'), function(f){ var b=f.querySelector('.pry-q b'), k=f.querySelector('.pry-kpi');
    return [b ? b.textContent : '', k && !k.hidden ? k.innerText.replace(/\s+/g,' ').trim() : null]; });

  { const page=await abrir(false, 'Noviembre');
    await page.evaluate(() => PINTAR()); await page.waitForTimeout(200);
    const r=await page.evaluate(() => ({ n:document.querySelectorAll('.pry-kpi').length, p:window._pedidas.length }));
    chk('1 · sin la bandera: ningún renglón nuevo ni lectura del dashboard', r.n===0 && r.p===0, r);
    await page._ctx.close(); }

  { const page=await abrir(true, 'Noviembre');
    await page.evaluate(() => PINTAR()); await page.waitForTimeout(300);
    const r=await page.evaluate(KPI), m=Object.fromEntries(r);
    chk('2 · Carola (con tilde en Kommo): leads, cierres, conversión, respuesta y atendidos', m['Carola Chavez']==='📥 236 leads · ✅ 16 cierres · 🎯 6,8 % conversión · ⏱ responde en 3.1 h · 92 % atendidos', m['Carola Chavez']);
    chk('2 · Isabel («Isabel Robledo - Central» en Kommo)', /253 leads/.test(m['Isabel Robledo']||'') && /8,3 %/.test(m['Isabel Robledo']||''), m['Isabel Robledo']);
    chk('2 · Maria sale del dashboard de Sueña', /99 leads/.test(m['Maria Flores']||''), m['Maria Flores']);
    const u=await page.evaluate(() => window._pedidas);
    const bus = await page.evaluate(() => [pryKpiBuscar({'juan pablo':1}, 'juan pablo paredes'), pryKpiBuscar({'fernando peinado charcas':2}, 'fernando peinado'),
      pryKpiBuscar({'maria':3}, 'maria flores'), pryKpiBuscar({'juan pablo a':4,'juan pablo b':5}, 'juan pablo'), pubDashYm({month:'Noviembre 2026', year:2026})]);
    chk('2b · nombres de Kommo distintos (Juan Pablo, Fernando Peinado Charcas) y el mes «Noviembre 2026»', JSON.stringify(bus)==='[1,2,null,null,"2026-11"]', bus);
    chk('2 · lee el dashboard de este sitio y el de Sueña', u.some(x=>/^index\.html/.test(x)) && u.some(x=>/VISCARRA\/index\.html/.test(x)), u);
    await page._ctx.close(); }

  { const page=await abrir(true, 'Octubre');
    await page.evaluate(() => PINTAR()); await page.waitForTimeout(300);
    const r=await page.evaluate(KPI);
    chk('3 · dashboard de otro mes: no se muestra nada', r.every(x=>x[1]===null), r);
    await page._ctx.close(); }

  { const page=await abrir(true, 'Noviembre');
    const r=await page.evaluate(() => { try{ localStorage.clear(); }catch(e){}
      var a=mnoHtml(); mnoOcultar(true); var b=mnoHtml(), ocu=mnoOculta(); pqsIr('pry-mano'); var c=mnoHtml();
      return { a:/id="mno-ocultar"/.test(a), b:/id="mno-mostrar"/.test(b) && !/mno-ocultar/.test(b), ocu:ocu, c:/id="mno-ocultar"/.test(c) && !mnoOculta() }; });
    chk('4 · «🙈 Ocultar» la pliega, se recuerda, y el botón de arriba la vuelve a mostrar', r.a && r.b && r.ocu && r.c, r);
    await page._ctx.close(); }

  chk('sin errores de página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(FAIL?1:0);
})();
