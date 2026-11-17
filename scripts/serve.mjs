import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const root = resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.py':'text/plain','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    // Exercise the same project subpath used by GitHub Pages, as well as localhost root.
    const pathname=url.pathname.replace(/^\/iceberg-lab(?=\/|$)/,'') || '/';
    const path = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    if(!path.startsWith(root+'/')) throw new Error('Invalid path');
    const data = await readFile(path);
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173,'0.0.0.0',()=>console.log('http://localhost:4173'));
