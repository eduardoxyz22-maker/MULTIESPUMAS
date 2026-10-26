// La foto del recibo para el video: inventada (cliente, monto y número no existen).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const p=await b.newPage({ viewport:{ width:720, height:960 } });
  await p.setContent(`<body style="margin:0;background:linear-gradient(135deg,#8a6a4a,#6e5238);display:flex;align-items:center;justify-content:center;height:960px;font-family:'Liberation Serif',serif">
  <div style="width:560px;background:#fffdf6;transform:rotate(-2.2deg);box-shadow:0 18px 40px rgba(0,0,0,.45);padding:34px 38px;color:#1d2433;border-radius:4px">
   <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1f6f6a;padding-bottom:12px">
    <div><div style="font:800 26px Inter,sans-serif;color:#0f766e;letter-spacing:.04em">MULTIESPUMAS</div><div style="font:13px Inter,sans-serif;color:#555">Santa Cruz · Bolivia</div></div>
    <div style="text-align:right"><div style="font:700 22px Inter,sans-serif">RECIBO</div><div style="font:700 20px 'Liberation Mono',monospace;color:#b91c1c">N° 0458</div></div></div>
   <div style="margin-top:18px;font-size:21px;line-height:2.1">
    <div>Fecha: <u style="font-family:'Liberation Mono',monospace;text-decoration-color:#999">&nbsp;04/11/2026&nbsp;</u></div>
    <div>Recibí de: <u>&nbsp;Lucía Fernández Rojas&nbsp;</u></div>
    <div>La suma de: <b style="font-family:'Liberation Mono',monospace">Bs 1.000,00</b></div>
    <div>Son: <u>&nbsp;mil 00/100 bolivianos&nbsp;</u></div>
    <div>Por: <u>&nbsp;adelanto · Nota de venta 3245&nbsp;</u></div>
    <div>Forma de pago: <b>Efectivo</b></div></div>
   <div style="display:flex;justify-content:space-between;margin-top:40px;font:14px Inter,sans-serif;color:#555">
    <div style="border-top:1px solid #333;width:200px;text-align:center;padding-top:6px">Recibí conforme</div>
    <div style="border-top:1px solid #333;width:200px;text-align:center;padding-top:6px">Entregué conforme</div></div>
   <div style="margin-top:14px;font:12px Inter,sans-serif;color:#888;text-align:center">Ejemplo para la guía · datos inventados</div>
  </div></body>`);
  await p.screenshot({ path:__dirname+'/recibo.jpg', type:'jpeg', quality:88 });
  await b.close();
})();
