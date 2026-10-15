/* 🧩 INFORME DE ATC: POR MARCA Y LÍNEA (§4ll) + 🧹 LA BARRA DE ATC (§4lm). 15/10, el dueño:
     · «en el informe falta un consolidado de productos y línea: oro, titanio, especial… ejemplo 9 titanio por hundimiento, 3 especial
       semi ortopédico… y separar las marcas, Heaven y Sueña, tú tienes esos datos para separar»;
     · «demasiados botones… copiar debería estar en la ficha desplegable al tocar una ATC; completar Trello ya no sirve, ya importamos todo»;
     · «informe PDF, ese botón solo es para gerencia: solo debe salir cuando colocan la clave o ingresan como administración o logística».
   Lo que cuida, con ATC inventadas y el reloj clavado en el jueves 15/10/2026 a las 10:00 de Bolivia:
     1. marca, línea y producto de cada renglón (`atciProdsAtc`), con los nombres como los escriben (TIT ICE 2.5 PLZ, SEMI ORTOP…);
     2. las cuentas por marca → línea → producto × motivo (`atciLineas`): una ATC cuenta una vez por línea; «9 TITANIO por hundimiento»;
     3. la dona de marcas usa la MISMA marca (la del producto);
     4. las hojas «Por marca y línea»: el texto, y que nada pise el pie de la hoja;
     5. con un tipo elegido (contra costo), solo ese tipo;
     6. la barra: sin «📋 Copiar» ni «🔗 Completar con Trello»; «📋 Copiar» en la ficha copia SU fila (17 columnas, sin encabezado);
     7. el «📄 Informe PDF»: escondido para un vendedor y para Contabilidad; a la vista con la clave, como Administración o Logística.
   Datos SINTÉTICOS. Se corre:  node tests/test_atc_lineas.js   (desde la raíz; PEDIDOS=<otro pedidos.html> para probar otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00-04:00'));
  await page.route(/^https?:/, r => r.abort());
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(600);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err:String(e && e.message || e) }));

  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    apiSave=function(){ return Promise.resolve({ok:true}); };
    var n=0, ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    var A=function(vend, prods, mot, tipo, extra){
      n++; var id='l'+(n<10?'0':'')+n, f='2026-10-'+(n%14<9?'0':'')+(1+n%14);
      var p={ id:id, oc:'ATC 10-'+(100+n), fecha:f, turno:'AM', cliente:'CLIENTE '+n, vendedor:vend, celular:'7000'+(1000+n), zona:'Centro', ts:ts(f), entregado:false,
              productos:prods.map(function(x){ var o=(typeof x==='string') ? { desc:x } : x; o.medida=o.medida||'140x190'; o.cant=1; o.atc={ mot:mot, det:'detalle de prueba', fcom:'2025-01-01', tipo:tipo||'gar' }; return o; }) };
      for(var k in (extra||{})) p[k]=extra[k];
      return p;
    };
    STATE=[
      /* Heaven · TITANIO: 9 por hundimiento (escrito de varias formas) y 1 por ruido; una ATC trae colchón Y somier de la línea */
      A('Mirian Salazar', ['TITANIO ICE'], 'Hundimiento'), A('Maria Flores', ['TIT ICE 2.5 PLZ'], 'Hundimiento'), A('Carola Chavez', ['TITANIO LATEX'], 'Hundimiento'),
      A('Isabel Robledo', ['COMPRO UN TTIANIO ICE 2021'], 'Hundimiento'), A('Mirian Salazar', ['TIT LATEX 3.5 PLZ'], 'Hundimiento'), A('Maria Flores', ['TITANIO ICE TITANIO'], 'Hundimiento'),
      A('Carola Chavez', ['TITANIO ICE', 'SOMIER TITANIO ICE'], 'Hundimiento'), A('Jonathan Monje', ['SOMIER ICE 2 PLZ'], 'Hundimiento'), A('Mirian Salazar', ['titanio ice'], 'Hundimiento', 'stc'),
      A('Maria Flores', ['TITANIO LATEX'], 'Ruido'),
      /* Heaven · ESPECIAL: 3 semiortopédico por resortes; ORO por el código de la lista (el nombre no dice nada) */
      A('Carola Chavez', ['ESPECIAL SEMIORTOPEDICO'], 'Resortes'), A('Isabel Robledo', ['ESPECIAL SEMI ORTOPEDICO 140X190'], 'Resortes'), A('Mirian Salazar', ['ESPECIAL SEMIORTOP.'], 'Resortes'),
      A('Mirian Salazar', [{ desc:'lo que dijo el cliente', codigo:'CH1039' }], 'Patas'),
      /* Heaven sin línea: «SEMI ORTOPEDICO» a secas puede ser ESPECIAL o PLATA: no se adivina */
      A('Maria Flores', ['SEMI ORTOPEDICO 2.5 PLZ'], 'Tela / pillow'),
      /* Sueña: por el nombre del catálogo, y «SEMI ORTOPEDICO» de un vendedor de Sueña SÍ es su línea */
      A('Mauricio Merida', ['COLCHON SOFT'], 'Hundimiento', 'stc'), A('Juan Pablo Paredes', ['COLCHON SOFT'], 'Hundimiento'), A('Mauricio Merida', ['SEMI ORTOPEDICO'], 'Ruido'),
      /* ROHO: FLEX / PEDIC, aunque lo cargue un vendedor de Sueña */
      A('ROHO', ['PRODUCTO: DYNAMIPEDIC DE 3 PLZ'], 'Hundimiento'), A('Juan Pablo Paredes', ['MEMORY FLEX'], 'Resortes'),
      /* sin producto anotado y de alguien sin marca */
      A('Eduardo Añez', [{ desc:'' }], 'Otro')
    ];
  });

  /* ---- 1. marca, línea y producto ---- */
  let r = await ev(() => {
    var f=function(desc, vend, cod){ var x=atciProdsAtc({ vendedor:vend||'Mirian Salazar', productos:[{ desc:desc, codigo:cod }] })[0]; return x ? (x.marca+' / '+x.lin+' / '+x.prod) : '—'; };
    return { tit:f('TIT ICE 2.5 PLZ'), typo:f('COMPRO UN TTIANIO ICE 2021'), som:f('SOMIER ICE 2 PLZ'), esp:f('ESPECIAL SEMIORTOPEDICO 140X190'), semiH:f('SEMI ORTOPEDICO 2.5 PLZ'),
      semiS:f('SEMI ORTOPEDICO', 'Mauricio Merida'), soft:f('COLCHON SOFT', 'Maria Flores'), oro:f('RETAPIZADO ORO ORTOPEDICO 3.5 PLZ COMPLETO'), birelax:f('ORO BI RELAX 200X200 CM'),
      dyn:f('PRODUCTO: DYNAMIPEDIC DE 3 PLZ', 'ROHO'), flex:f('MEMORY FLEX', 'Mauricio Merida'), cod:f('cualquier cosa', 'Maria Flores', 'CH1039'), plata:f('PLATA TROPICAL'),
      prem:f('COLCHON SUEÑA PREMIER DELUXE', 'Mirian Salazar'), dos:atciProdsAtc({ vendedor:'Mirian Salazar', productos:[{ desc:'TITANIO ICE' }, { desc:'Titanio Ice' }] }).length };
  });
  chk('«TIT ICE 2.5 PLZ» = Heaven / TITANIO / TITANIO ICE (sin la medida, TIT escrito entero)', r.tit==='heaven / TITANIO / TITANIO ICE', r.tit);
  chk('«COMPRO UN TTIANIO ICE 2021» = TITANIO ICE (el error de tipeo, sin «compro» ni el año)', r.typo==='heaven / TITANIO / TITANIO ICE', r.typo);
  chk('«SOMIER ICE» = línea TITANIO (ICE en la lista es solo de TITANIO)', r.som==='heaven / TITANIO / SOMIER ICE', r.som);
  chk('«ESPECIAL SEMIORTOPEDICO 140X190» = Heaven / ESPECIAL / ESPECIAL SEMIORTOPEDICO', r.esp==='heaven / ESPECIAL / ESPECIAL SEMIORTOPEDICO', r.esp);
  chk('«SEMI ORTOPEDICO» de una vendedora de Heaven: sin línea (ESPECIAL o PLATA, no se adivina)', r.semiH==='heaven / Sin línea en el nombre / SEMIORTOPEDICO', r.semiH);
  chk('…y de un vendedor de Sueña es su línea SEMIORTOPÉDICO', r.semiS==='suena / SEMIORTOPÉDICO / SEMIORTOPEDICO', r.semiS);
  chk('«COLCHON SOFT» es Sueña aunque lo cargue una vendedora de Heaven (la marca es del producto)', r.soft==='suena / SOFT / SOFT', r.soft);
  chk('«RETAPIZADO ORO ORTOPEDICO 3.5 PLZ COMPLETO» = ORO / ORO ORTOPEDICO (sin el motivo ni «completo»)', r.oro==='heaven / ORO / ORO ORTOPEDICO', r.oro);
  chk('«ORO BI RELAX 200X200 CM» = ORO / ORO BI RELAX', r.birelax==='heaven / ORO / ORO BI RELAX', r.birelax);
  chk('«PRODUCTO: DYNAMIPEDIC DE 3 PLZ» = ROHO / PEDIC / DYNAMIC PEDIC', r.dyn==='roho / PEDIC / DYNAMIC PEDIC', r.dyn);
  chk('«MEMORY FLEX» de un vendedor de Sueña = ROHO / FLEX', r.flex==='roho / FLEX / MEMORY FLEX', r.flex);
  chk('con el código de la lista (CH1039), el nombre de la lista: ORO ANATOMICO VISCOLASTICO', r.cod==='heaven / ORO / ORO ANATOMICO VISCOLASTICO', r.cod);
  chk('«PLATA TROPICAL» = la PRIMERA línea que dice: PLATA', r.plata==='heaven / PLATA / PLATA TROPICAL', r.plata);
  chk('«COLCHON SUEÑA PREMIER DELUXE» = Sueña / PREMIER DELUXE (sin «colchón» ni la marca)', r.prem==='suena / PREMIER DELUXE / PREMIER DELUXE', r.prem);
  chk('dos renglones del mismo producto (mayúsculas o no) son UNO', r.dos===1, r.dos);

  /* ---- 2. las cuentas ---- */
  r = await ev(() => {
    var D=atciDatos('2026-10'), L=D.lin, M={};
    L.marcas.forEach(function(b){ M[b.k||'sin']={ n:b.n, lin:b.lineas.map(function(x){ return x.lbl+':'+x.n; }).join(), top:b.top.map(function(x){ return x.n+' '+x.lin+' por '+x.mot; }),
      mots:b.mots.map(function(m){ return m.lbl+':'+m.n; }).join(),
      tit:(b.lineas.filter(function(x){ return x.lbl==='TITANIO'; })[0]||{}),
      esp:(b.lineas.filter(function(x){ return x.lbl==='ESPECIAL'; })[0]||{}) }; });
    var t=M.heaven.tit, e=M.heaven.esp;
    return { n:D.n, sinProd:L.sinProd, M:M, titMot:t.mot, titProds:(t.prods||[]).map(function(p){ return p.lbl+':'+p.n; }).join(),
      espProds:(e.prods||[]).map(function(p){ return p.lbl+':'+p.n+':'+JSON.stringify(p.mot); }).join(), marcas:D.marcas.map(function(m){ return m.k+':'+m.n; }).join() };
  });
  if(r.__err) r={ __err:r.__err, M:{ heaven:{ top:[], mots:'' }, suena:{ top:[] }, roho:{} } };   // una página sin esto (PEDIDOS=…): que cuente rojo, no que se caiga
  chk('21 ATC en octubre; 1 sin producto anotado (no entra en las líneas)', r.n===21 && r.sinProd===1, [r.n, r.sinProd]);
  chk('Heaven: 15 ATC; líneas TITANIO 10, ESPECIAL 3, ORO 1 y «Sin línea» al final', r.M.heaven.n===15 && r.M.heaven.lin==='TITANIO:10,ESPECIAL:3,ORO:1,Sin línea en el nombre:1', r.M.heaven);
  chk('TITANIO: 9 por Hundimiento y 1 por Ruido (la ATC con colchón Y somier cuenta UNA vez en la línea)', r.titMot && r.titMot.Hundimiento===9 && r.titMot.Ruido===1, r.titMot);
  chk('…y debajo sus productos: TITANIO ICE 6 (escrito de 5 formas), TITANIO LATEX 3, SOMIER ICE 1, SOMIER TITANIO ICE 1', r.titProds==='TITANIO ICE:6,TITANIO LATEX:3,SOMIER ICE:1,SOMIER TITANIO ICE:1', r.titProds);
  chk('ESPECIAL: «ESPECIAL SEMIORTOPEDICO» 3, los 3 por Resortes', r.espProds==='ESPECIAL SEMIORTOPEDICO:3:{"Resortes":3}', r.espProds);
  chk('lo que más se repite en Heaven: «9 TITANIO por Hundimiento» y «3 ESPECIAL por Resortes» (lo de 1 no)', r.M.heaven.top.join('|')==='9 TITANIO por Hundimiento|3 ESPECIAL por Resortes|1 ORO por Patas|1 TITANIO por Ruido'
    && r.M.heaven.top[0]==='9 TITANIO por Hundimiento', r.M.heaven.top);
  chk('las columnas de Heaven: los motivos de más a menos (Hundimiento 9, Resortes 3…)', /^Hundimiento:9,Resortes:3,/.test(r.M.heaven.mots), r.M.heaven.mots);
  chk('Sueña: 3 ATC — SOFT 2 (hundimiento) y SEMIORTOPÉDICO 1', r.M.suena.n===3 && r.M.suena.lin==='SOFT:2,SEMIORTOPÉDICO:1' && r.M.suena.top[0]==='2 SOFT por Hundimiento', r.M.suena);
  chk('ROHO: 2 ATC — FLEX 1 y PEDIC 1', r.M.roho.n===2 && /FLEX:1/.test(r.M.roho.lin) && /PEDIC:1/.test(r.M.roho.lin), r.M.roho);
  chk('la dona «De qué marca» cuenta igual (por el producto): Heaven 15, Sueña 3, ROHO 2, sin marca 1', r.marcas==='heaven:15,suena:3,roho:2,:1', r.marcas);

  /* ---- 3. las hojas ---- */
  r = await ev(() => {
    UNLOCKED=true;
    var D=atciDatos('2026-10'), H=atciHojas(D), L=H.filter(function(h){ return h.indexOf('Por marca y línea')>=0; });
    var box=document.createElement('div'); box.style.cssText='position:absolute;left:0;top:0'; document.body.appendChild(box);
    var txt=[], mide=[];
    L.forEach(function(h){ box.innerHTML=h; var pag=box.firstChild, pt=pag.getBoundingClientRect().top, pie=pag.querySelector('.ai-pie').getBoundingClientRect().top-pt;
      var fin=0; [].forEach.call(pag.querySelectorAll('.ai-cuerpo > *'), function(el){ fin=Math.max(fin, el.getBoundingClientRect().bottom-pt); });
      txt.push(pag.innerText); mide.push({ fin:Math.round(fin), pie:Math.round(pie), alto:pag.offsetHeight }); });
    box.remove(); UNLOCKED=false;
    var orden=H.map(function(h){ return (h.match(/<h2>([^<]*)/)||['',''])[1].trim(); });
    return { n:L.length, txt:txt.join('\n'), mide:mide, orden:orden };
  });
  if(r.__err) r={ __err:r.__err, mide:[], orden:[], txt:'' };
  chk('dos hojas «Por marca y línea» (Heaven llena la primera), después de «Los otros productos» y antes de «Dónde están»', r.n===2 &&
    r.orden.indexOf('¿Qué líneas y por qué?')===r.orden.indexOf('¿Qué productos y de qué marca?')+2 && r.orden.indexOf('¿Qué líneas y por qué?')<r.orden.indexOf('¿Dónde están las ATC del mes?'), r.orden);
  chk('la hoja: Heaven, Sueña y ROHO, cada una con cuántas de las 21', /Heaven\s*15 de las 21 ATC \(71%\)/.test(r.txt) && /Sueña\s*3 de las 21 ATC \(14%\)/.test(r.txt) && /ROHO \(FLEX \/ PEDIC\)\s*2 de las 21 ATC/.test(r.txt), r.txt.slice(0, 700));
  chk('«Lo que más se repite»: 9 TITANIO por hundimiento y 3 ESPECIAL por resortes', /LO QUE MÁS SE REPITE\s*9 TITANIO por hundimiento\s*3 ESPECIAL por resortes/i.test(r.txt), (r.txt.match(/LO QUE MÁS[^\n]*\n?[^\n]*/i)||[''])[0]);
  chk('la tabla: la línea con su total y cada motivo, y debajo sus productos («↳ TITANIO ICE»)', /TITANIO\s+10\s+9\s+1/.test(r.txt) && /↳ TITANIO ICE\s+6/.test(r.txt) && /↳ SOMIER TITANIO ICE\s+1/.test(r.txt), (r.txt.match(/Línea · producto[\s\S]{0,400}/)||[''])[0]);
  chk('«Sin línea en el nombre» con lo que escribieron, y la nota que lo explica', /Sin línea en el nombre\s+1/.test(r.txt) && /↳ SEMIORTOPEDICO/.test(r.txt) && /el nombre que cargaron no dice la línea/.test(r.txt), '');
  chk('la nota dice la ATC sin producto', /1 ATC sin producto anotado no entran acá/.test(r.txt), (r.txt.match(/Cada número[^\n]*/)||[''])[0]);
  chk('nada pisa el pie de la hoja (A4 apaisada, 794 de alto)', r.mide.length>0 && r.mide.every(function(m){ return m.alto===794 && m.fin>0 && m.fin<m.pie; }), r.mide);
  /* muchas líneas: siguen en otra hoja y tampoco pisan el pie */
  r = await ev(() => {
    var S=STATE, N=['TITANIO ICE','TITANIO LATEX','SOMIER TITANIO ICE','ORO ORTOPEDICO','ORO ANATOMICO VISCOLASTICO','ORO BI RELAX','SOMIER ORO','ESPECIAL SEMIORTOPEDICO','ESPECIAL ORTOPEDICO D/C',
      'ESPECIAL ANTIALERGICO','SOMIER ESPECIAL','PLATA SEMIORTOPEDICO','SOMIER PLATA SEMIORTOPEDICO','SEMI ORTOPEDICO','HEAVEN TROPICAL','DREAM REFORZADO','PLATA TROPICAL','ORO BAMBU AMAZON',
      'ALM/HEAVEN','COLCHONETA HEAVEN','MEMORY FLEX','PILLOW PEDIC','COLCHON SOFT','COLCHON SEMIORTOP.','COLCHON SUEÑA ESSENTIAL','COLCHON BAHIA','COMBO SUEÑA PREMIER DELUXE','COLCHON SMART'];
    var MO=['Hundimiento','Resortes','Ruido','Retapizado / costura','Patas','Tela / pillow','Cambio de producto','Otro',''];
    STATE=[]; for(var i=0;i<150;i++){ var d=1+(i%14), f='2026-10-'+(d<10?'0':'')+d;
      STATE.push({ id:'m'+i, oc:'ATC 10-'+(300+i), fecha:f, cliente:'C'+i, vendedor:(i%4?'Mirian Salazar':'Mauricio Merida'), ts:new Date(f+'T10:00:00-04:00').getTime(),
        productos:[{ desc:N[(i*5)%N.length], medida:'140x190', cant:1, atc:{ mot:MO[(i*7)%MO.length], tipo:'gar' } }] }); }
    var D=atciDatos('2026-10'), L=atciHojas(D).filter(function(h){ return h.indexOf('Por marca y línea')>=0; });
    STATE=S;
    var box=document.createElement('div'); box.style.cssText='position:absolute;left:0;top:0'; document.body.appendChild(box);
    var mide=L.map(function(h){ box.innerHTML=h; var pag=box.firstChild, pt=pag.getBoundingClientRect().top, pie=pag.querySelector('.ai-pie').getBoundingClientRect().top-pt, fin=0;
      [].forEach.call(pag.querySelectorAll('.ai-cuerpo > *'), function(el){ fin=Math.max(fin, el.getBoundingClientRect().bottom-pt); }); return { fin:Math.round(fin), pie:Math.round(pie) }; });
    var t=L.map(function(h){ box.innerHTML=h; return box.innerText; }); box.remove();
    return { n:L.length, mide:mide, sigue:t.slice(1).some(function(x){ return /· sigue/.test(x); }), de:/\(1 de \d\)/.test(t[0]||'') };
  });
  if(r.__err) r={ __err:r.__err, mide:[] };
  chk('150 ATC y 28 productos: siguen en más hojas («1 de N», «· sigue») y ninguna pisa el pie', r.n>=2 && r.de && r.sigue && r.mide.length && r.mide.every(function(m){ return m.fin>0 && m.fin<m.pie; }), r);

  /* ---- 4. con un tipo elegido ---- */
  r = await ev(() => { var D=atciDatos('2026-10','stc'); return D.lin.marcas.filter(function(b){ return b.n; }).map(function(b){ return b.k+':'+b.lineas.map(function(x){ return x.lbl+'='+x.n; }).join('+'); }).join(); });
  chk('solo contra costo (STC): 1 TITANIO de Heaven y 1 SOFT de Sueña', r==='heaven:TITANIO=1,suena:SOFT=1', r);

  /* ---- 5. la barra y «📋 Copiar» en la ficha ---- */
  r = await ev(async () => {
    UNLOCKED=false; try{ localStorage.removeItem(LS_ADM_DEV); }catch(e){} quienRol('');
    showView('atc'); segSet('atc-mode','mes'); document.getElementById('atc-mes').value='2026-10'; renderAtc();
    var barra=document.getElementById('atc-search').closest('.filters, .card, div').parentElement;
    var btns=[].map.call(document.querySelectorAll('#view-atc button'), function(b){ return b.offsetParent ? b.textContent.trim() : ''; }).filter(Boolean);
    var copiado=null, o=window.copyText; window.copyText=function(t){ copiado=t; };
    verAtc('l11'); await new Promise(r=>setTimeout(r,80));
    var bt=document.getElementById('atc-copiar-una'); if(bt) bt.click();
    window.copyText=o; try{ closeModal(); }catch(e){}
    return { btns:btns, trello:!!document.getElementById('atc-trello-btn'), ficha:!!bt, copiado:copiado };
  });
  if(r.__err) r={ __err:r.__err, btns:[] };
  chk('la barra de ATC ya no tiene «📋 Copiar» ni «🔗 Completar con Trello»', !r.btns.some(function(t){ return /Copiar|Completar con Trello/.test(t); }) && !r.trello, r.btns);
  const cols = (r.copiado||'').split('\t');
  chk('la ficha de la ATC tiene «📋 Copiar»', r.ficha, r.ficha);
  chk('…y copia SOLO su fila: 17 columnas (las de siempre), sin encabezado ni saltos de línea', cols.length===17 && cols[0]==='ATC 10-111' && cols[3]==='CLIENTE 11' && /ESPECIAL SEMIORTOPEDICO/.test(cols[5]) &&
    cols[6]==='Resortes' && cols[16]==='Garantía' && !/N° ATC/.test(r.copiado) && !/\n/.test(r.copiado), cols);

  /* ---- 6. el informe, solo gerencia ---- */
  r = await ev(() => {
    var vis=function(){ var w=document.getElementById('atc-informe-wrap'), b=document.getElementById('atc-informe-btn'); return !!(b && b.offsetParent) && !!w; };
    var ov=function(){ return document.getElementById('atci-ov').style.display; };
    var out={};
    UNLOCKED=false; try{ localStorage.removeItem(LS_ADM_DEV); }catch(e){} quienRol(''); renderAtc(); out.vendedor=vis();
    abrirInformeAtc(); out.abreVend=ov(); out.toast=(document.getElementById('toast')||{}).textContent||'';
    quienRol('conta'); renderAtc(); out.conta=vis();
    quienRol('logistica'); renderAtc(); out.logistica=vis();
    quienRol('admin'); renderAtc(); out.admin=vis();
    quienRol(''); renderAtc(); out.otraVez=vis();
    UNLOCKED=true; mostrarBotonesTodos(); out.clave=vis();
    abrirInformeAtc(); out.abreClave=ov(); atciCerrar();
    UNLOCKED=false; mostrarBotonesTodos(); out.sinClave=vis();
    /* elegir «Logística» en «¿Quién está usando el panel?» lo muestra en el acto */
    quienElegir('', 'logistica'); out.elegir=vis(); quienElegir('Mirian Salazar'); out.vendElegida=vis();
    return out;
  });
  chk('un vendedor NO ve «📄 Informe PDF», y si igual lo llama, no abre y dice que es de gerencia', !r.vendedor && r.abreVend!=='flex' && /para gerencia/.test(r.toast), r);
  chk('Contabilidad tampoco lo ve', !r.conta, r.conta);
  chk('como Logística o Administración, sí', r.logistica && r.admin && !r.otraVez, r);
  chk('con la clave de Administración, sí (y abre); sin la clave, se esconde', r.clave && r.abreClave==='flex' && !r.sinClave, r);
  chk('elegir «Logística» en «¿Quién está usando el panel?» lo muestra; elegir una vendedora lo esconde', r.elegir && !r.vendElegida, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
