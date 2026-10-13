import {mkdir,copyFile} from 'node:fs/promises';

const source=new URL('../node_modules/onnxruntime-web/dist/',import.meta.url);
const destination=new URL('../public/models/onnxruntime-web/',import.meta.url);
await mkdir(destination,{recursive:true});
for(const filename of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm']){
  try{await copyFile(new URL(filename,source),new URL(filename,destination))}
  catch{throw new Error(`onnxruntime-web asset missing: ${filename}`)}
}
console.log('Copied ONNX Runtime Web WASM assets to same-origin public models folder.');
