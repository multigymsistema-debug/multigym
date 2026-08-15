import fs from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve(new URL('../frontend/public/models/',import.meta.url).pathname);
await fs.mkdir(out,{recursive:true});
const base='https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const files=[
 'tiny_face_detector_model-weights_manifest.json','tiny_face_detector_model.bin',
 'face_landmark_68_model-weights_manifest.json','face_landmark_68_model.bin',
 'face_recognition_model-weights_manifest.json','face_recognition_model.bin'
];
for(const file of files){const res=await fetch(base+file);if(!res.ok)throw new Error(`Falha ao baixar ${file}: ${res.status}`);await fs.writeFile(path.join(out,file),Buffer.from(await res.arrayBuffer()));console.log('baixado',file)}
console.log('Modelos faciais instalados em frontend/public/models');
