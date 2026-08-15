const API=(import.meta.env.VITE_API_URL??'http://localhost:3333').replace(/\/$/,'');
export function getToken(){return localStorage.getItem('multigym_token')??''}
export async function api(path:string,options:RequestInit={}){const headers=new Headers(options.headers);if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');const token=getToken();if(token)headers.set('Authorization',`Bearer ${token}`);const r=await fetch(API+path,{...options,headers});let data:any=null;try{data=await r.json()}catch{}if(r.status===401){localStorage.removeItem('multigym_token');localStorage.removeItem('multigym_user');window.location.href='/';throw new Error('Sessão expirada.')}if(!r.ok)throw new Error(data?.error??'Não foi possível concluir a operação.');return data}
export const post=(p:string,b:any={})=>api(p,{method:'POST',body:JSON.stringify(b)});
export const put=(p:string,b:any)=>api(p,{method:'PUT',body:JSON.stringify(b)});
export const del=(p:string)=>api(p,{method:'DELETE'});
