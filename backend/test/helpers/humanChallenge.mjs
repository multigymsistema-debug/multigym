export async function registerGym(base,fields){
 const call=async(path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json().catch(()=>null)}};
 const challenge=(await call('/api/auth/human-challenge')).data;
 const selected=challenge.options.filter(x=>x.label===challenge.prompt.slice(challenge.prompt.lastIndexOf(' ')+1)).map(x=>x.id);
 const verified=await call('/api/auth/human-challenge/verify',{challenge_id:challenge.challenge_id,expires_at:challenge.expires_at,selected});
 if(verified.status!==200)throw new Error('Challenge verification failed: '+JSON.stringify(verified.data));
 return call('/api/auth/register',{...fields,challenge_id:verified.data.challenge_id,challenge_token:verified.data.verification_token,challenge_expires_at:verified.data.verification_expires_at});
}
