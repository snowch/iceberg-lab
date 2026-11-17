import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const root = resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.py':'text/plain','.svg':'image/svg+xml','.webm':'video/webm','.mp4':'video/mp4','.vtt':'text/vtt','.jpg':'image/jpeg'};
http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    // Exercise the same project subpath used by GitHub Pages, as well as localhost root.
    const pathname=url.pathname.replace(/^\/iceberg-lab(?=\/|$)/,'') || '/';
    const path = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    if(!path.startsWith(root+'/')) throw new Error('Invalid path');
    const data = await readFile(path);
    const headers={'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':data.length,'Accept-Ranges':'bytes'};
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if(range){
      const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;
      if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${data.length}`});res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));return;
    }
    res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173,'0.0.0.0',()=>console.log('http://localhost:4173'));
