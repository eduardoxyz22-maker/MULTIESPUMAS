/* Build del dashboard de junio: precompila el JSX del .src.html a JS plano (sin Babel en el navegador)
   e inlinea React/ReactDOM para que cargue sin depender de CDN.
   Requisitos: npm install @babel/standalone@7 react@18.3.1 react-dom@18.3.1
   Uso: node build-junio.js  (lee dashboard-junio-2026.src.html -> escribe dashboard-junio-2026.html) */
const fs=require('fs'); const Babel=require('@babel/standalone');
const SRC='dashboard-junio-2026.src.html', OUT='dashboard-junio-2026.html';
let h=fs.readFileSync(SRC,'utf8');
const reactUMD=fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8');
const rdUMD=fs.readFileSync('node_modules/react-dom/umd/react-dom.production.min.js','utf8');
const re=/<script type="text\/babel">([\s\S]*?)<\/script>/g; let m,out='',last=0,n=0;
while((m=re.exec(h))!==null){ const c=Babel.transform(m[1],{presets:['env','react'],sourceType:'script',compact:false}).code; out+=h.slice(last,m.index)+'<script>\n'+c+'\n</script>'; last=m.index+m[0].length; n++; }
out+=h.slice(last);
out=out.replace(/\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@babel\/standalone@7\/babel\.min\.js"><\/script>/,'');
out=out.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/react@[^"]*"><\/script>/,()=>'<script>/*react 18.3.1*/'+reactUMD+'</script>');
out=out.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/react-dom@[^"]*"><\/script>/,()=>'<script>/*react-dom 18.3.1*/'+rdUMD+'</script>');
out=out.replace('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
fs.writeFileSync(OUT,out,'utf8');
console.log('build OK: '+n+' bloques, '+(Buffer.byteLength(out)/1024).toFixed(0)+'KB');
