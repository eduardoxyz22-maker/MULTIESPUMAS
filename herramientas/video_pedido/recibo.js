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
  /* Las capturas de un pago por QR (para «cobrar el saldo» y «venta de tienda»): genéricas, con «EJEMPLO», sin la marca de ningún banco. */
  const qr = async (monto, de, hora, op, nom) => {
    await p.setViewportSize({ width:540, height:960 });
    await p.setContent(`<body style="margin:0;background:#eef2f6;font-family:Inter,sans-serif;color:#1f2937;height:960px;display:flex;flex-direction:column">
      <div style="background:#334155;color:#fff;padding:26px 24px 20px;font-weight:800;font-size:20px">App del banco <span style="font-weight:500;opacity:.8">· Transferencia QR</span></div>
      <div style="margin:22px;background:#fff;border-radius:18px;padding:26px 24px;box-shadow:0 6px 18px rgba(0,0,0,.08);position:relative;overflow:hidden">
        <div style="position:absolute;top:150px;left:-30px;right:-30px;text-align:center;transform:rotate(-18deg);font:900 74px Inter,sans-serif;color:rgba(220,38,38,.12);letter-spacing:.08em">EJEMPLO</div>
        <div style="display:flex;align-items:center;gap:12px"><div style="width:48px;height:48px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:28px;color:#16a34a">✓</div>
          <div><div style="font-weight:800;font-size:21px">Transferencia exitosa</div><div style="color:#64748b;font-size:15px">05/11/2026 · ${hora}</div></div></div>
        <div style="margin:26px 0 8px;color:#64748b;font-size:15px">Monto</div><div style="font:800 42px Inter,sans-serif">Bs ${monto}</div>
        <div style="margin-top:22px;font-size:17px;line-height:2">
          <div><span style="color:#64748b">De:</span> <b>${de}</b></div>
          <div><span style="color:#64748b">Para:</span> <b>MULTIESPUMAS</b></div>
          <div><span style="color:#64748b">N° de operación:</span> <b style="font-family:'Liberation Mono',monospace">${op}</b></div>
          <div><span style="color:#64748b">Glosa:</span> pago colchón</div></div></div>
      <div style="margin-top:auto;padding:18px;text-align:center;color:#94a3b8;font-size:14px">Captura de ejemplo para la guía · datos inventados</div></body>`);
    await p.screenshot({ path:__dirname+'/'+nom, type:'jpeg', quality:88 });
  };
  await qr('2.400,00', 'LUCIA FERNANDEZ R.', '15:42', '000000481', 'qr_pago.jpg');
  await qr('2.900,00', 'JORGE SUAREZ', '16:05', '000000517', 'qr_tienda.jpg');
  /* (29/10) La «foto del colchón hundido» que el cliente le manda a la vendedora, para el video de la ATC: dibujada, con «EJEMPLO». */
  await p.setViewportSize({ width:960, height:720 });
  await p.setContent(`<body style="margin:0;height:720px;background:linear-gradient(180deg,#d9cbb7 0,#cdbb9f 58%,#a88b67 58%,#9a7d5b 100%);font-family:Inter,sans-serif;position:relative;overflow:hidden">
    <div style="position:absolute;left:0;right:0;top:46px;height:300px;background:linear-gradient(180deg,#efe7da,#e3d7c4);"></div>
    <svg width="960" height="720" style="position:absolute;inset:0">
      <defs><radialGradient id="h" cx="58%" cy="52%" r="30%"><stop offset="0" stop-color="#8c8173" stop-opacity=".75"/><stop offset=".55" stop-color="#b8ad9c" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <pattern id="q" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M0 30 Q15 20 30 30 T60 30" fill="none" stroke="#d9d4ca" stroke-width="2"/><circle cx="30" cy="30" r="2.4" fill="#cfc8bb"/></pattern></defs>
      <path d="M90 300 L870 300 L905 520 L55 520 Z" fill="#f7f4ee"/><path d="M90 300 L870 300 L905 520 L55 520 Z" fill="url(#q)"/>
      <path d="M55 520 L905 520 L905 585 L55 585 Z" fill="#e7e1d6"/><path d="M55 548 L905 548" stroke="#00B5AD" stroke-width="10"/>
      <ellipse cx="560" cy="410" rx="220" ry="78" fill="url(#h)"/>
      <path d="M380 420 Q560 470 740 418" fill="none" stroke="#9f9584" stroke-width="3" stroke-dasharray="6 7" opacity=".7"/>
    </svg>
    <div style="position:absolute;top:250px;left:-40px;right:-40px;text-align:center;transform:rotate(-14deg);font:900 92px Inter,sans-serif;color:rgba(220,38,38,.14);letter-spacing:.08em">EJEMPLO</div>
    <div style="position:absolute;left:0;right:0;bottom:16px;text-align:center;color:#fff;font-size:15px;text-shadow:0 1px 2px rgba(0,0,0,.5)">Foto de ejemplo para la guía · colchón hundido en el medio</div></body>`);
  await p.screenshot({ path:__dirname+'/colchon_atc.jpg', type:'jpeg', quality:86 });
  await b.close();
})();
