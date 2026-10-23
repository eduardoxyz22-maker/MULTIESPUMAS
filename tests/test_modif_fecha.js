/* 📅 El aviso «ESTE PEDIDO FUE MODIFICADO» dice de qué día y turno a cuál (23/10, dueño: «¿para qué fecha entró originalmente?»).
   Se corre:  node tests/test_modif_fecha.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+JSON.stringify(e)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  const r = await page.evaluate(() => {
    var a={ fecha:'2026-10-22', turno:'PM', productos:[{desc:'TITANIO ICE',medida:'140x190',cant:2}] };
    var b={ fecha:'2026-10-24', turno:'AM', productos:[{desc:'TITANIO ICE',medida:'140x190',cant:2}] };
    var p={ id:'x1', productos:JSON.parse(JSON.stringify(b.productos)) };
    marcarModificado(p, 'Isabel Robledo', difPedido(a, b));
    var txt=(document.createRange().createContextualFragment(avisoModifHtml(p)).textContent||'').replace(/\s+/g,' ');
    var aviso=function(){ return (document.createRange().createContextualFragment(avisoModifHtml(p)).textContent||'').replace(/\s+/g,' '); };
    var out={ d:difPedido(a,b), igual:difPedido(a,a), txt:txt, nadie:aviso(), porNadie:modDe(p).por };
    setVendedorMem(''); quienRol('logistica'); marcarModificado(p, 'Isabel Robledo', difPedido(a, b)); out.logi=aviso(); out.porLogi=modDe(p).por;
    quienRol(''); setVendedorMem('Isabel Robledo'); marcarModificado(p, 'Isabel Robledo', difPedido(a, b)); out.ella=aviso();
    setVendedorMem('Carola Chavez'); marcarModificado(p, 'Isabel Robledo', difPedido(a, b)); out.otra=aviso();
    (p.productos||[]).forEach(function(x){ x.mod={ f:'2026-10-23', h:'14:35', q:'Isabel Robledo', d:['📅 cambió la fecha de entrega'] }; }); out.vieja=aviso();
    return out;
  });
  chk('el cambio de fecha dice de qué día a cuál', r.d.indexOf('📅 cambió la fecha de entrega: del 22/10 al 24/10')>=0, r.d);
  chk('el cambio de turno dice de cuál a cuál', r.d.indexOf('🕐 cambió de turno: PM → AM')>=0, r.d);
  chk('sin cambios no dice nada', r.igual.length===0, r.igual);
  chk('el aviso rojo de la ficha muestra la fecha de antes', /del 22\/10 al 24\/10/.test(r.txt), r.txt.slice(0,300));
  chk('sin nadie elegido en el aparato: no inventa quién (dice de quién es el pedido)', r.porNadie==='?' && /Lo cambiaron el .*el pedido es de Isabel Robledo; no se sabe quién lo cambió/.test(r.nadie), r.nadie.slice(0,200));
  chk('logística lo cambió: «Logística lo cambió … (el pedido es de Isabel Robledo)»', r.porLogi==='Logística' && /Logística lo cambió el .*\(el pedido es de Isabel Robledo\)/.test(r.logi), r.logi.slice(0,200));
  chk('la misma vendedora: «Isabel Robledo lo cambió» sin repetir el nombre', /Isabel Robledo lo cambió el /.test(r.ella) && !/el pedido es de/.test(r.ella), r.ella.slice(0,200));
  chk('otra vendedora: «Carola Chavez lo cambió … (el pedido es de Isabel Robledo)»', /Carola Chavez lo cambió el .*\(el pedido es de Isabel Robledo\)/.test(r.otra), r.otra.slice(0,200));
  chk('una marca de antes (sin quién) ya no dice que lo cambió la vendedora', /Lo cambiaron el .*no se sabe quién/.test(r.vieja) && !/Isabel Robledo lo cambió/.test(r.vieja), r.vieja.slice(0,200));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
