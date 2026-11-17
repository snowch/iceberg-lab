let py;
let runner;
const base = new URL('./', self.location.href);
const status = text => self.postMessage({type:'status',text});
async function boot(){
  status('Loading Python WASM runtime…');
  const indexURL = new URL('_iceberg/pyodide/',base).href;
  const packageBaseUrl = new URL('_iceberg/wheels/',base).href;
  const {loadPyodide} = await import(indexURL+'pyodide.mjs');
  const lockFileURL = packageBaseUrl+'pyodide-lock.json';
  py = await loadPyodide({indexURL,packageBaseUrl,lockFileURL});
  status('Loading Iceberg, Arrow and DuckDB packages…');
  const lock = await (await fetch(lockFileURL)).json();
  await py.loadPackage(Object.keys(lock.packages), {messageCallback:()=>status('Loading the Iceberg lesson tools…')});
  for(const name of ['shims.py','lab.py']){
    const response = await fetch(new URL('python/'+name,base));
    if(!response.ok) throw new Error('Cannot load '+name);
    py.FS.writeFile('/'+name,await response.text());
  }
  py.runPython('import sys; sys.path.insert(0,"/"); import lab');
  runner = py.runPython('lab.run');
  status('Ready · real Iceberg in your browser');
  self.postMessage({type:'ready'});
}
let busy = false;
self.onmessage = async ({data})=>{
  if(busy) return;
  busy = true;
  try{
    if(data.type === 'boot') await boot();
    if(data.type === 'run'){
      if(!runner) throw new Error('Runtime is not ready. Start it first.');
      const result = JSON.parse(runner(data.setup,data.code,data.check));
      self.postMessage({type:'result',...result});
    }
    if(data.type === 'export'){
      const proxy = py.runPython('lab.export_zip()');
      const bytes = proxy.toJs(); proxy.destroy();
      self.postMessage({type:'archive',bytes},[bytes.buffer]);
    }
    if(data.type === 'inspect'){
      py.globals.set('_inspect_relative',data.path);
      const value=JSON.parse(py.runPython('lab.json.dumps(lab.inspect_path(_inspect_relative), default=str)'));
      self.postMessage({type:'inspection',value});
    }
  }catch(error){
    self.postMessage({type:'error',text:String(error)});
  }finally{busy=false;}
};
