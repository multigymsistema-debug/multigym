const API_URL=import.meta.env.VITE_API_URL||'http://localhost:3000/api';
const API_ROOT=API_URL.replace(/\/api\/?$/,'');
export const studentToken=()=>localStorage.getItem('multigym_student_token')||'';
export async function studentApi<T=any>(path:string,options:RequestInit={}){
  const headers=new Headers(options.headers);
  if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const t=studentToken(); if(t)headers.set('Authorization',`Bearer ${t}`);
  const response=await fetch(`${API_ROOT}${path}`,{...options,headers});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||'Não foi possível concluir a operação.');(error as any).traceId=data.trace_id;throw error;}
  return data as T;
}
export const studentGet=<T=any>(path:string)=>studentApi<T>(path);
export const studentPost=<T=any>(path:string,body:any)=>studentApi<T>(path,{method:'POST',body:JSON.stringify(body)});
export const studentPut=<T=any>(path:string,body:any)=>studentApi<T>(path,{method:'PUT',body:JSON.stringify(body)});
export const studentDel=<T=any>(path:string)=>studentApi<T>(path,{method:'DELETE'});
export async function studentAudio(path:string,body:any){const headers=new Headers({'Content-Type':'application/json'}),t=studentToken();if(t)headers.set('Authorization',`Bearer ${t}`);const response=await fetch(`${API_ROOT}${path}`,{method:'POST',headers,body:JSON.stringify(body)});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Não foi possível gerar o áudio.')}return response.blob();}
