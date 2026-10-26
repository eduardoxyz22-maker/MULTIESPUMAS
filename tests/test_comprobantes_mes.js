/* 📁 LOS COMPROBANTES DEL MES PARA EL CONTADOR (§4mg, C2, 25/10; dueño: «c1, 2, 3 aprobado»).

   LO QUE CUIDA:
   1. Entran los pagos del MES que NO son efectivo (QR, tarjeta, transferencia, también el flete), por banco; el efectivo y otro mes no.
   2. Cuenta los que no tienen foto, en rojo.
   3. El nombre de archivo dice día, banco, monto y cliente (y _1, _2 con varias fotos).
   4. «⬇️ Excel con los enlaces»: una fila por foto con el enlace de Drive; sin foto, «FALTA LA FOTO».
   5. Con un vendedor elegido, solo lo suyo.
   4d-4f (26/10, dueño: «los enlaces no aparecen directos para entrar»): el .xlsx de verdad tiene la foto como ENLACE («Ver foto»,
      azul, TargetMode External), encabezado con color y sin triangulitos de «número como texto».
   7 (26/10, dueño: «qué cutre se ve… no se ve moderno»): la ventana nueva — total y anillo, acciones en tarjetas, miniaturas, los
      bancos y «Sin foto» filtran, el buscador no pierde el foco, y a 390/320 px nada se sale.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_comprobantes_mes.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var mes=todayStr().slice(0,7), ts=new Date(mes+'-05T11:00:00-04:00').getTime(), n=0;
    var P=function(o){ n++; return Object.assign({ id:'c'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:mes+'-26', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:ts }, o); };
    STATE=[
      P({ cliente:'ANA QR', metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:3000, fecha:mes+'-05', nota:'11', comps:['fotoA1','fotoA2'] }]) }),
      P({ cliente:'BETO TARJETA', metodoPago:textoCobros([{ metodo:'Tarjeta', monto:3000, fecha:mes+'-06', nota:'12' }]) }),
      P({ cliente:'CARLA EFECTIVO', metodoPago:textoCobros([{ metodo:'Efectivo', monto:3000, fecha:mes+'-07', nota:'13' }]) }),
      P({ cliente:'DANI OTROMES', metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:3000, fecha:'2026-09-28', nota:'14', comps:['fotoD'] }]) }),
      P({ cliente:'ELSA SUEÑA', vendedor:'Mauricio Merida', metodoPago:textoCobros([{ metodo:'QR', banco:'Económico', monto:3000, fecha:mes+'-08', nota:'15', comps:['fotoE'] }]) })
    ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 200); });
    document.getElementById('cta-vendedor').value='';
    var L=compsMesDatos(mes);
    compsAbrir(); await new Promise(function(r){ setTimeout(r, 80); });
    var res=[].map.call(document.querySelectorAll('.cps-r'), function(x){ return x.textContent; });
    var noms=document.querySelector('.cps-t').textContent;
    var hojas=null, nombre='', bx=window.buildXlsx, dl=window.downloadBlob;
    window.buildXlsx=function(sh){ hojas=sh; return 'x'; }; window.downloadBlob=function(b, nm){ nombre=nm; };
    try{ compsExcel(); }finally{ window.buildXlsx=bx; window.downloadBlob=dl; }
    var b64=''; try{ var by=buildXlsx(hojas), s=''; for(var i=0;i<by.length;i++) s+=String.fromCharCode(by[i]); b64=btoa(s); }catch(e){ b64='ERR '+e.message; }
    closeModal();
    var s=document.getElementById('cta-vendedor'); for(var i=0;i<s.options.length;i++) if(/Mauricio/.test(s.options[i].text)) s.value=s.options[i].value;
    var Lm=compsMesDatos(mes); s.value='';
    return { L:L.map(function(x){ return x.p.cliente+'|'+x.met+'|'+x.comps.length; }), res:res, noms:noms, filas:hojas&&hojas[0].matrix, nombre:nombre, Lm:Lm.map(function(x){ return x.p.cliente; }), b64:b64 };
  });
  chk('1. entran QR y tarjeta del mes; ni el efectivo ni otro mes', r.L && r.L.length===3 && !r.L.some(t=>/EFECTIVO|OTROMES/.test(t)), r.L);
  chk('2. «Sin foto»: 1 (la tarjeta)', r.res && r.res.some(t=>/Sin foto\s*1/.test(t)), r.res);
  chk('3. nombre de archivo con día, banco, monto y cliente', /2026-10-05_QR-BISA_3000_ANA-QR_1\.jpg/.test(r.noms) && /2026-10-05_QR-BISA_3000_ANA-QR_2\.jpg/.test(r.noms), r.noms && r.noms.slice(0,300));
  const filas = r.filas||[];
  chk('4a. Excel: una fila por foto (2 de Ana) + la tarjeta sin foto + Elsa', filas.length===1+4, filas.length);
  chk('4b. el enlace es el de Drive y la sin foto dice FALTA', filas.some(f=>f[8] && f[8].link==='https://drive.google.com/file/d/fotoA1/view') && filas.some(f=>/BETO/.test(f[2]) && f[8]==='FALTA LA FOTO'), filas.slice(1));
  chk('4c. el archivo se llama comprobantes-AAAA-MM', r.nombre==='comprobantes-2026-10.xlsx', r.nombre);
  /* 4d · (26/10, dueño: «los enlaces no aparecen directos para entrar») el .xlsx de verdad, abierto con Python (solo la librería
     estándar: el zip y el XML): la foto es un ENLACE (dice «Ver foto», apunta a Drive, afuera del archivo), el encabezado lleva el
     estilo con color y no hay triangulitos de «número como texto». `COMPS_XLSX=<ruta>` deja una copia para abrirla a mano. */
  {
    const fs=require('fs'), os=require('os'), { execFileSync }=require('child_process');
    let out={ err:'sin archivo' };
    if(r.b64 && !/^ERR/.test(r.b64)){
      const dir=fs.mkdtempSync(path.join(os.tmpdir(), 'comps-')), f=path.join(dir, 'c.xlsx');
      fs.writeFileSync(f, Buffer.from(r.b64, 'base64'));
      if(process.env.COMPS_XLSX) fs.copyFileSync(f, process.env.COMPS_XLSX);
      const py=[
        'import json,sys,zipfile,xml.etree.ElementTree as ET',
        'z=zipfile.ZipFile(sys.argv[1]); M="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"',
        'R="{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"; P="{http://schemas.openxmlformats.org/package/2006/relationships}"',
        'sh=ET.fromstring(z.read("xl/worksheets/sheet1.xml")); rels=ET.fromstring(z.read("xl/worksheets/_rels/sheet1.xml.rels"))',
        'tg={r.get("Id"):(r.get("Target"),r.get("TargetMode")) for r in rels.findall(P+"Relationship")}',
        'val={c.get("r"):"".join(t.text or "" for t in c.iter(M+"t")) for c in sh.iter(M+"c")}',
        'sty={c.get("r"):c.get("s") for c in sh.iter(M+"c")}',
        'kids=[k.tag.replace(M,"") for k in sh]',
        'L=[[h.get("ref"),val.get(h.get("ref")),tg.get(h.get(R+"id"),(None,None))[0],tg.get(h.get(R+"id"),(None,None))[1]] for h in sh.iter(M+"hyperlink")]',
        'print(json.dumps({"links":L,"a1":sty.get("A1"),"i2s":sty.get("I2"),"ign":sh.find(M+"ignoredErrors") is not None,"orden":kids}))'
      ].join('\n');
      try{ out=JSON.parse(execFileSync('python3', ['-I', '-c', py, f], { encoding:'utf8' })); }catch(e){ out={ err:String(e.message).slice(0,300) }; }
    }
    chk('4d. el Excel abre y cada foto (2 de Ana + 1 de Elsa) es un enlace de verdad a Drive', out.links && out.links.length===3 && out.links.every(l=>/^https:\/\/drive\.google\.com\/file\/d\/.+\/view$/.test(l[2]) && l[3]==='External' && /^Ver foto/.test(l[1])), out);
    chk('4e. dice «Ver foto 1» / «Ver foto 2» (o «Ver foto» si hay una sola) en vez de la dirección larga, en azul subrayado', out.links && ['Ver foto 1','Ver foto 2','Ver foto'].every(t=>out.links.some(l=>l[1]===t)) && out.i2s==='28', out);
    chk('4f. encabezado con color, sin triangulitos de «número como texto», y los bloques en el orden que pide Excel', out.a1==='1' && out.ign===true &&
        JSON.stringify((out.orden||[]).filter(k=>/sheetData|hyperlinks|ignoredErrors/.test(k)))===JSON.stringify(['sheetData','hyperlinks','ignoredErrors']), out);
  }
  chk('5. con un vendedor elegido, solo lo suyo', JSON.stringify(r.Lm)===JSON.stringify(['ELSA SUEÑA']), r.Lm);

  /* 6 · 📁 «Armar la carpeta en Drive» (servidor 2026-10-25-a) */
  const r6 = await ev(async () => {
    var llamadas=[]; window.apiPost=function(b){ llamadas.push(JSON.parse(JSON.stringify(b)));
      if(b.action!=='compsCarpeta') return Promise.resolve({ ok:true });
      var pend = llamadas.length===1 ? b.archivos.slice(1) : [];   // la 1ª tanda «se corta» y devuelve lo que falta
      return Promise.resolve({ ok:true, carpeta:{ url:'https://drive.google.com/drive/folders/X', nombre:'Comprobantes para el contador / Comprobantes '+b.mes },
        copiados:b.archivos.length-pend.length, yaEstaban:0, ajenas:0, fallaron:0, pendientes:pend }); };
    compsAbrir(); await new Promise(function(r){ setTimeout(r, 60); });
    SERVER_VER='2026-10-15-a'; compsCarpeta(); await new Promise(function(r){ setTimeout(r, 60); });
    var viejo={ txt:document.getElementById('comps-carpeta').textContent, n:llamadas.length };
    SERVER_VER='2026-10-25-a'; await compsCarpeta(); await new Promise(function(r){ setTimeout(r, 60); });
    var nuevo={ txt:document.getElementById('comps-carpeta').textContent, n:llamadas.length, link:(document.querySelector('#comps-carpeta a')||{}).href,
      nombres:[].concat.apply([], llamadas.map(function(l){ return (l.archivos||[]).map(function(x){ return x.nombre; }); })) };
    closeModal(); return { viejo:viejo, nuevo:nuevo };
  });
  chk('6a. con el servidor de antes NO se llama (lo trataría como un guardado) y lo dice', r6.viejo.n===0 && /2026-10-25-a/.test(r6.viejo.txt), r6.viejo);
  chk('6b. con el nuevo: sigue con lo que quedó pendiente y termina con el enlace', r6.nuevo.n===2 && /Carpeta lista/.test(r6.nuevo.txt) && /3 de 3 fotos/.test(r6.nuevo.txt) && r6.nuevo.link==='https://drive.google.com/drive/folders/X', r6.nuevo);
  chk('6c. manda los nombres de archivo de siempre', r6.nuevo.nombres.indexOf('2026-10-05_QR-BISA_3000_ANA-QR_1.jpg')>=0, r6.nuevo.nombres);

  /* 7 · ✨ (26/10, dueño: «qué cutre se ve… no se ve moderno») la ventana nueva: los bancos FILTRAN, el buscador, las miniaturas
     y nada se sale de la pantalla en el celular (390 y 320 px). */
  const r7 = await ev(async () => {
    var out={}, filas=function(){ return [].map.call(document.querySelectorAll('.cps-t tbody tr.cp2-row b'), function(b){ return b.textContent; }); };
    compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 60); });
    out.todas=filas(); out.total=(document.querySelector('.cp2-tot b')||{}).textContent;
    out.anillo=(document.querySelector('.cp2-ring')||{}).textContent;
    compsListaPintar(); var lh=document.getElementById('comps-lista').innerHTML;   // en el acto: sin red, el <img> se va con su error
    out.miniaturas=(lh.match(/<img[^>]+lh3\.googleusercontent\.com\/d\/foto/g)||[]).length; out.casillas=document.querySelectorAll('.cp2-th').length;
    out.miniLink=(document.querySelector('.cp2-th')||{}).getAttribute && document.querySelector('.cp2-th').getAttribute('href');
    out.acciones=[].map.call(document.querySelectorAll('.cp2-a b'), function(b){ return b.textContent; });
    var bisa=[].filter.call(document.querySelectorAll('.cps-r'), function(b){ return /QR BISA/.test(b.textContent); })[0]; bisa.click();
    out.bisa=filas(); out.bisaOn=!!document.querySelector('.cps-r.on') && /QR BISA/.test(document.querySelector('.cps-r.on').textContent);
    out.filtroTxt=(document.querySelector('.cp2-filtro')||{}).textContent||'';
    [].filter.call(document.querySelectorAll('.cps-r'), function(b){ return /QR BISA/.test(b.textContent); })[0].click();   // otra vez: lo saca
    out.otraVez=filas().length;
    compsFiltrar('sinfoto'); out.sinfoto=filas(); out.falta=/falta la foto/.test((document.querySelector('.cps-t')||{}).textContent||'');
    compsFiltrar('sinfoto');
    var q=document.getElementById('comps-q'); q.focus(); q.value='elsa'; q.dispatchEvent(new Event('input'));
    out.busca=filas(); out.focoSigue=document.activeElement && document.activeElement.id==='comps-q';
    q.value='nadie así'; q.dispatchEvent(new Event('input')); out.nada=(document.querySelector('.cp2-nada')||{}).textContent||'';
    closeModal(); return out;
  });
  chk('7a. arriba: lo cobrado y cuántos pagos tienen foto', r7.total==='Bs 9.000' && /2 de 3/.test(r7.anillo||'') && /faltan 1/.test(r7.anillo||''), r7);
  chk('7b. las tres acciones como tarjetas y las fotos en miniatura que abren la foto', JSON.stringify(r7.acciones)===JSON.stringify(['Excel con los enlaces','Armar la carpeta en Drive','Revisar las fotos con IA']) &&
      r7.miniaturas===3 && r7.casillas===3 && r7.miniLink==='https://drive.google.com/file/d/fotoA1/view', r7);
  chk('7c. tocar un banco filtra (y lo dice); tocarlo otra vez vuelve a todos', JSON.stringify(r7.bisa)===JSON.stringify(['ANA QR']) && r7.bisaOn && /1 de 3/.test(r7.filtroTxt) && r7.otraVez===3, r7);
  chk('7d. «Sin foto» deja solo la que falta y lo marca', JSON.stringify(r7.sinfoto)===JSON.stringify(['BETO TARJETA']) && r7.falta, r7.sinfoto);
  chk('7e. el buscador filtra sin perder el foco y dice cuando no hay nada', JSON.stringify(r7.busca)===JSON.stringify(['ELSA SUEÑA']) && r7.focoSigue && /Nada con ese filtro/.test(r7.nada), r7);
  for (const W of [390, 320]) {
    await page.setViewportSize({ width:W, height:800 });
    const a = await ev(async () => { compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 120); });
      var m=document.querySelector('#modal .modal'), o={ doc:document.documentElement.scrollWidth, vw:innerWidth, modal:m.scrollWidth, caja:m.clientWidth,
        filaGrid:getComputedStyle(document.querySelector('tr.cp2-row')).display };
      closeModal(); return o; });
    chk('7f. '+W+' px: nada se sale de la pantalla y las filas pasan a tarjetas', a.doc<=a.vw && a.modal<=a.caja+1 && a.filaGrid==='grid', a);
  }
  await page.setViewportSize({ width:1440, height:1000 });
  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
