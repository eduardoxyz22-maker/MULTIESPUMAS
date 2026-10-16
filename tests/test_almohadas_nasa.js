/* 🛏️ LAS TRES ALMOHADAS NASA NUEVAS EN LA LISTA DE PRODUCTOS (§4lq, 16/10).

   El dueño, después de revisar las almohadas del Excel de los tres almacenes: *«LA NASA ES LA CH1195. Las otras 3 son nuevas,
   debemos añadirlas en la lista desplegable de productos»*. Las tres: CH1244 «TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX», CH2533 «NASA
   ALTO FREEZE DUOFLEX» y CH1246 «ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA», con el nombre y SIN medida, como las trae el Excel.

   ⚠️ LO QUE CUIDA (las «NA» fallan contra lo publicado, `92d08ff`):
   1. Están en la lista (`CODIGOS`) y en la búsqueda del formulario, y escribir el código completa el producto.
   2. NO se parte el stock: su clave de la lista es la MISMA que el Excel ya les había dado con el nombre crudo, así que cada una
      sigue siendo UNA fila con sus números, y un pedido con el código se reserva ahí.
   3. La «Proyección del mes» no las cuenta como colchones (por descarte, «NASA ALTO FREEZE DUOFLEX» lo era).
   Y lo de siempre: la NASA de siempre es la CH1195 («ALM/NASA»), «ALMOHADA NASA» escrita sin código sigue yendo ahí, y la 50x70
   (CD1403) y la 50x90 (CD1459) no cambian.

   Reloj CLAVADO (viernes 16/10/2026, 10:00 de Bolivia).
   Se corre:  node tests/test_almohadas_nasa.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_92d08ff.html node tests/test_almohadas_nasa.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  var LOG='PRODUCTOS TERMINADOS FAB.', BZ='01-05-025  Almacen Distribucion Banzer', IM='IM - PRODUCTOTERMINADO';
  window._K={ gel:'TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX|', frz:'NASA ALTO FREEZE DUOFLEX|', ant:'ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA|',
              nasa:'ALM/NASA|50X70', a70:'ALMOHADA|50X70', a90:'ALMOHADA FIBRA SILICONADA|50X90' };
  /* El stock como lo dejaron los Excel ANTES de que las tres estuvieran en la lista: con su nombre crudo (sin medida). */
  window._stock=function(){
    var hoy=todayStr(), K=window._K, t=Date.now()-3600000;
    var st={ v:2, pv:3, c:{ f:hoy, hora:'10:05:00', u:{}, solo0:true, alm:LOG, cod:{}, t:t }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.c.u[K.gel]=40;  st.c.cod.CH1244=K.gel;
    st.c.u[K.frz]=140; st.c.cod.CH2533=K.frz;
    st.c.u[K.a70]=2;   st.c.cod.CD1403=K.a70;
    st.c.u[K.a90]=11;  st.c.cod.CD1459=K.a90;
    st.g[BZ]={ f:hoy, hora:'10:05:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.g[BZ].u[K.gel]=24; st.g[BZ].cod.CH1244=K.gel;
    st.g[BZ].u[K.nasa]=1; st.g[BZ].cod.CH1195=K.nasa;
    st.g[BZ].u[K.a70]=9;  st.g[BZ].cod.CD1403=K.a70;
    st.g[IM]={ f:hoy, hora:'10:06:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.g[IM].u[K.ant]=25; st.g[IM].cod.CH1246=K.ant;
    st.g[IM].u[K.a90]=6;  st.g[IM].cod.CD1459=K.a90;
    st.al[LOG]='log'; st.al[BZ]='sale'; st.al[IM]='otro';
    return st;
  };
  window._cargar=async function(){
    var f=stockSumarDias(todayStr(), 3);
    window._SRV.pedidos=[
      { id:'p-gel', oc:'OC 10-201', fecha:f, turno:'AM', cliente:'CLIENTE GEL', vendedor:'Maria Flores', celular:'70000001', zona:'Norte',
        productos:[{ codigo:'CH1244', desc:'TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX', medida:'', cant:3, precio:300 }] },
      { id:'p-ant', oc:'OC 10-202', fecha:f, turno:'AM', cliente:'CLIENTE ANT', vendedor:'Isabel Robledo', celular:'70000002', zona:'Sur',
        productos:[{ codigo:'CH1246', desc:'ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA', medida:'', cant:2, precio:300 }] }
    ];
    window._SRV.stock=window._stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._filas=function(){
    var out={}; stockData().lista.forEach(function(o){
      if(/NASA|TRAVESS|ALMOHADA/.test(o.k)) (out[o.k]=out[o.k]||[]).push({ ptf:o.deposito, bz:o.enSale||0, im:o.enOtros||0, comp:o.comp||0 });
    }); return out;
  };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._probarCodigo=async function(cod){
    if(document.getElementById('modal').classList.contains('on')) closeModal();
    showView('form'); resetForm();
    var c=document.querySelectorAll('#f-productos .prod-card')[0], e=c.querySelector('.prod-codigo'); e.value=cod; ev(e); ev(e, 'change');
    await _esperar(500);
    return { desc:c.querySelector('.prod-desc').value, codigo:e.value };
  };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  /* ── 1. En la lista ── */
  console.log('\n── 1. En la lista de productos ──');
  const L = await ev(() => ({
    cods:['CH1244','CH2533','CH1246'].map(function(c){ var v=CODIGOS[c]; return v ? (c+'|'+v.d+'|'+v.m) : (c+'|NO ESTÁ'); }),
    lista:(typeof NOMBRES_LISTA!=='undefined' ? NOMBRES_LISTA : []).filter(function(t){ return /NASA|TRAVESS/.test(t); })
  }));
  chk('NA1. las tres están en la lista con el nombre del Excel y sin medida',
      L.cods && L.cods[0]==='CH1244|TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX|' && L.cods[1]==='CH2533|NASA ALTO FREEZE DUOFLEX|' && L.cods[2]==='CH1246|ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA|', L.cods);
  chk('NA2. la búsqueda del formulario las ofrece con su código (y sigue la ALM/NASA CH1195)',
      ['CH1244','CH2533','CH1246','CH1195'].every(c=>(L.lista||[]).some(t=>t.indexOf('· '+c)>=0)), L.lista);
  for (const [cod, nom] of [['CH1244','TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX'], ['CH2533','NASA ALTO FREEZE DUOFLEX'], ['CH1246','ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA']]) {
    const r = await ev(async (c) => _probarCodigo(c), cod);
    chk('NA3. escribir '+cod+' en el formulario completa «'+nom+'»', r && r.desc===nom, r);
  }

  /* ── 2. El stock no se parte ── */
  console.log('\n── 2. El stock no se parte ──');
  const s = await ev(async () => { await _cargar(); var K=window._K; return {
    filas:_filas(),
    claves:{ gel:stockClave({ codigo:'CH1244', desc:'TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX', medida:'' }),
             frz:stockClave({ codigo:'CH2533', desc:'NASA ALTO FREEZE DUOFLEX', medida:'' }),
             ant:stockClave({ codigo:'CH1246', desc:'ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA', medida:'' }) },
    cod:{ ptf:STOCK.c.cod.CH1244, bz:STOCK.g['01-05-025  Almacen Distribucion Banzer'].cod.CH1244, im:STOCK.g['IM - PRODUCTOTERMINADO'].cod.CH1246 },
    cuadrito:(function(){ SALDO_CACHE=null; var v=saldoVeredicto(K.gel, 1, '', proximoDiaEntrega(), true); return { tipo:v.tipo, alm:v.alm, pend:v.pend }; })(),
    K:K }; });
  const F = s.filas || {}, K = s.K || {};
  chk('NA4. un pedido con el código va a la MISMA clave que ya tenían en el stock (las tres)',
      s.claves && s.claves.gel===K.gel && s.claves.frz===K.frz && s.claves.ant===K.ant, s.claves);
  chk('NA5. la GELFLEX es UNA fila: 40 en PTF, 24 en Banzer y los 3 vendidos reservados ahí',
      F[K.gel] && F[K.gel].length===1 && F[K.gel][0].ptf===40 && F[K.gel][0].bz===24 && F[K.gel][0].comp===3, F[K.gel]);
  chk('NA6. la FREEZE es UNA fila con 140 en PTF', F[K.frz] && F[K.frz].length===1 && F[K.frz][0].ptf===140, F[K.frz]);
  chk('NA7. la ANTISOFOCANTE es UNA fila con 25 en Moreno y los 2 vendidos', F[K.ant] && F[K.ant].length===1 && F[K.ant][0].im===25 && F[K.ant][0].comp===2, F[K.ant]);
  chk('NA8. no aparece ninguna fila nueva de NASA (solo las cuatro de siempre)',
      Object.keys(F).filter(k=>/NASA|TRAVESS/.test(k)).sort().join(' · ')===[K.nasa, K.ant, K.frz, K.gel].sort().join(' · '), Object.keys(F));
  chk('NA9. el mapa de códigos de PTF, Banzer y Moreno sigue apuntando a esas filas', s.cod && s.cod.ptf===K.gel && s.cod.bz===K.gel && s.cod.im===K.ant, s.cod);
  chk('NA10. el cuadrito del formulario de la GELFLEX dice que hay (64 en almacén, 3 vendidos)',
      s.cuadrito && s.cuadrito.tipo==='hay' && s.cuadrito.alm===64 && s.cuadrito.pend===3, s.cuadrito);

  /* ── 3. La proyección no las cuenta como colchones ── */
  console.log('\n── 3. La «Proyección del mes» ──');
  const p = await ev(() => {
    var u=function(x){ x.cant=x.cant||2; return pryUnidadesDe({ productos:[x] }).u; };
    return {
      gel:u({ codigo:'CH1244', desc:'TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX' }), frz:u({ codigo:'CH2533', desc:'NASA ALTO FREEZE DUOFLEX' }),
      ant:u({ codigo:'CH1246', desc:'ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA' }),
      frzSin:u({ codigo:'', desc:'NASA ALTO FREEZE DUOFLEX' }), gelSin:u({ codigo:'', desc:'TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX' }),
      colchon:u({ codigo:'', desc:'COLCHON TITANIO LATEX', medida:'140x190' }), conAlm:u({ codigo:'', desc:'COLCHON TITANIO + 2 ALMOHADAS NASA', cant:1 }),
      nasa:u({ codigo:'CH1195', desc:'ALM/NASA' })
    };
  });
  chk('NA11. con su código, las tres NASA no son colchones (0 unidades)', p.gel===0 && p.frz===0 && p.ant===0, p);
  chk('NA12. escritas sin código, «NASA ALTO FREEZE DUOFLEX» y «TRAVESSEIRO…» tampoco', p.frzSin===0 && p.gelSin===0, p);
  chk('(un colchón sigue contando, y «COLCHON TITANIO + 2 ALMOHADAS NASA» es UN colchón; la ALM/NASA, 0)', p.colchon===2 && p.conAlm===1 && p.nasa===0, p);

  /* ── 4. Lo de siempre ── */
  console.log('\n── 4. Lo que no cambia ──');
  const q = await ev(() => ({
    nasaSin:stockClave({ codigo:'', desc:'ALMOHADA NASA', medida:'' }), nasa:stockClave({ codigo:'CH1195', desc:'ALM/NASA', medida:'50x70' }),
    a70:stockClave({ codigo:'CD1403', desc:'ALMOHADA', medida:'50x70' }), a90:stockClave({ codigo:'CD1459', desc:'ALMOHADA FIBRA SILICONADA', medida:'50x90' }),
    fib70:stockClave({ codigo:'', desc:'ALMOHADA FIBRA SILICONADA', medida:'50x70' }),
    filas:_filas()
  }));
  chk('la NASA de siempre es la CH1195, y «ALMOHADA NASA» sin código sigue yendo ahí', q.nasa===K.nasa && q.nasaSin===K.nasa, q);
  chk('la 50x70 (CD1403, y «fibra siliconada 50x70» sin código) y la 50x90 (CD1459) no cambian', q.a70===K.a70 && q.fib70===K.a70 && q.a90===K.a90, q);
  chk('…con sus números: 50x70 = 2 PTF + 9 Banzer · 50x90 = 11 PTF + 6 Moreno · NASA = 1 en Banzer',
      q.filas[K.a70] && q.filas[K.a70][0].ptf===2 && q.filas[K.a70][0].bz===9 && q.filas[K.a90] && q.filas[K.a90][0].ptf===11 && q.filas[K.a90][0].im===6 && q.filas[K.nasa] && q.filas[K.nasa][0].bz===1, q.filas);
  const idem = await ev(async () => {
    var t1=filaStock().observaciones;
    var S2=leerStock({ observaciones:t1 }); var t2=JSON.stringify(stockMigrar(S2));
    var S3=leerStock({ observaciones:JSON.stringify(stockMigrar(leerStock({ observaciones:t1 }))) }); var t3=JSON.stringify(stockMigrar(S3));
    return t2===t3;
  });
  chk('leer y volver a leer el stock da lo mismo', idem===true, idem);
  chk('sin errores en la página', errores.length===0, errores.slice(0,3));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
