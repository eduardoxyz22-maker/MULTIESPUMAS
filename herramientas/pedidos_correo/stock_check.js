/* 📦 (17/11; dueño: «igual si es por falta de stock debes aclararle porque se movió para X días») ¿HAY STOCK PARA LOS PEDIDOS DEL CORREO?
   Antes de cargar, la vuelta del correo mira cada producto con la MISMA cuenta del cuadrito del formulario del panel (`saldoVeredictoFila`
   de pedidos.html: el Excel del día de cada almacén, lo vendido sin entregar, lo que está en producción, recoger de Moreno, las 48 h de
   fábrica y el cupo). No guarda nada: abre pedidos.html sin red, con la planilla que le pasan, y dice por pedido desde qué día se puede
   entregar cada producto y por qué.
   Uso:  python3 -I -c "import sys;sys.path.insert(0,'.');sys.argv=['x'];import cargar_pedidos as c,json;json.dump(c.leer(),open('<planilla.json>','w'))"
         node stock_check.js <pedidos.json> <planilla.json>
   Sale un JSON: [{clave, fecha, desde, mover, productos:[{nom, cant, tipo, titulo, desde}], motivo}] — `mover`=true si algún producto no
   llega para la fecha pedida; `desde` = el primer día en que llega todo; `motivo` = el porqué en palabras para el correo. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [pedidosJson, planillaJson] = process.argv.slice(2);
  const pedidos = JSON.parse(fs.readFileSync(pedidosJson, 'utf8')), planilla = fs.readFileSync(planillaJson, 'utf8');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  await ctx.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const out = await page.evaluate(([planilla, pedidos]) => {
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    var L = JSON.parse(planilla); STATE = L; try { leerCierresDeLista(L, true); } catch (e) {} ULTIMO_REFRESCO = Date.now();
    try { SALDO_CACHE = null; } catch (e) {}
    var plano = function (t) { return String(t || '').replace(/[✅📥🚚⏳🏭📐❓⚠️·]/g, ' ').replace(/\s+/g, ' ').trim(); };
    return pedidos.map(function (d) {
      var fecha = d.fecha, prods = [], desde = fecha || '';
      (d.productos || []).forEach(function (x) {
        var r = { nom: (x.desc || '') + (x.medida ? ' ' + x.medida : ''), cant: Number(x.cant) || 1 };
        try {
          var xx = { desc: x.desc, medida: x.medida, codigo: x.codigo, cant: x.cant }, inf = stockInfo(xx);
          var fl = saldoClasificar({ x: xx, k: inf.k, cat: !!inf.cat, completo: true }, null, true); fl.total = r.cant;
          var v = saldoVeredictoFila(fl, '', fecha);
          r.tipo = v.tipo; r.titulo = plano(saldoTitulo(v)); r.desde = v.desde || ''; r.sinCupo = !!v.sinCupo; r.noRec = !!v.noRec;
          if (r.desde && r.desde > desde) desde = r.desde;
        } catch (e) { r.error = String(e && e.message || e); }
        prods.push(r);
      });
      var tarde = prods.filter(function (r) { return r.desde && fecha && r.desde > fecha && r.tipo !== 'hay'; });
      var porque = { moreno: 'lo tenemos en nuestro almacén de fábrica y hay que traerlo', recogida: 'está en camino desde nuestro almacén de fábrica',
                     prod: 'está en producción', pedir: 'no tenemos stock y se fabrica', especial: 'es medida especial y se fabrica a pedido', fabcli: 'se está fabricando' };
      return { clave: d.clave, fecha: fecha, desde: desde, mover: tarde.length > 0, productos: prods,
               motivo: tarde.length ? tarde.map(function (r) { return r.nom + ': ' + (porque[r.tipo] || 'no llega para esa fecha') + ', se puede entregar desde el ' + saldoDiaTxt(r.desde); }).join('; ') : '' };
    });
  }, [planilla, pedidos]);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
