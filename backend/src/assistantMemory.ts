export type AgentId = 'nutrigym' | 'personalgym';
export type Candidate = { key:string; category:string; value:string; confidence:number; source:'explicit_student'; sourceDetail:string };
const clean=(s:string,max=300)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/** Extract only direct, non-clinical, first-person statements. Never infer a fact from assistant text. */
export function extractCandidate(message:string, agent:AgentId):Candidate|null {
  const m=clean(message,700),n=normalize(m);
  if(/[?？]/.test(m)||/\b(?:talvez|acho que|pode ser|nao sei|imagino|estimativa|aproximadamente)\b/.test(n)) return null;
  const patterns: Array<[RegExp,string,string]> = agent==='personalgym' ? [
    [/^(?:lembre(?:-se)?|guarde|anote)\s+que\s+(?:eu\s+)?prefiro\s+(?:treinar\s+)?(.+)$/i,'training_preference','preference'],
    [/^(?:eu\s+)?prefiro\s+treinar\s+(?:de\s+)?(.+)$/i,'training_time','availability'],
    [/^(?:eu\s+)?(?:posso|consigo)\s+treinar\s+(.+)$/i,'training_availability','availability'],
    [/^(?:lembre(?:-se)?|guarde|anote)\s+que\s+meu objetivo(?: de treino)?\s+(?:é|e)\s+(.+)$/i,'training_goal','goal'],
  ] : [
    [/^(?:lembre(?:-se)?|guarde|anote)\s+que\s+(?:eu\s+)?prefiro\s+(.+)$/i,'food_preference','preference'],
    [/^(?:eu\s+)?prefiro\s+(.+)$/i,'food_preference','preference'],
    [/^(?:lembre(?:-se)?|guarde|anote)\s+que\s+meu objetivo(?: nutricional)?\s+(?:é|e)\s+(.+)$/i,'nutrition_goal','goal'],
  ];
  for(const [pattern,key,category] of patterns){const match=m.match(pattern);if(!match?.[1])continue;const value=clean(match[1].replace(/[.!]+$/,''));if(value.length<2||/\b(alerg|intoler|lesao|lesão|dor|diagnost|doenca|doença|medic|tratamento|cirurg|cirurgia)\b/i.test(normalize(value)))return null;return {key,category,value,confidence:0.95,source:'explicit_student',sourceDetail:'Declaração direta do aluno em conversa autenticada.'};}
  return null;
}

export function rankMemories<T extends {memory_key?:string;memory_value?:string;category?:string;relevance?:number}>(rows:T[],message:string,limit=5):T[]{
 const query=new Set(normalize(message).match(/[a-z0-9]{3,}/g)||[]);if(!query.size)return[];
 return rows.map((row,index)=>{const body=normalize(`${row.memory_key||''} ${row.category||''} ${row.memory_value||''}`);const tokens=new Set(body.match(/[a-z0-9]{3,}/g)||[]);let score=[...query].filter(x=>tokens.has(x)).length; if(/horario|manha|tarde|noite|prefiro|disponibilidade/.test(normalize(message))&&/preference|availability/.test(String(row.category)))score+=2;if(/comer|aliment|refeic|lanche|alimento|nutri|consum/.test(normalize(message))&&row.category==='preference')score+=2;if(/objetivo|meta/.test(normalize(message))&&row.category==='goal')score+=2;return{row,index,score:score+(Number(row.relevance)||0)/1000};}).filter(x=>x.score>=1).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,Math.max(0,Math.min(limit,8))).map(x=>x.row);
}

/** Transactional memory write. Advisory lock serializes writes for a tenant/student/agent/key; history and current value commit together. */
export async function saveMemory(executor:any,scope:{gym:string;student:string},agent:AgentId,candidate:Candidate){
 const client=await executor.connect();const lockKey=`${scope.gym}:${scope.student}:${agent}:${candidate.key}`;
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[lockKey]);
  const current=(await client.query(`SELECT id,memory_value,source FROM assistant_memories WHERE gym_id=$1 AND student_id=$2 AND assistant=$3 AND memory_key=$4 AND active=true FOR UPDATE`,[scope.gym,scope.student,agent,candidate.key])).rows[0];
  if(current&&current.source==='profile') {await client.query('ROLLBACK');return {status:'profile_conflict' as const};}
  if(current?.memory_value===candidate.value){await client.query(`UPDATE assistant_memories SET updated_at=now(),valid_until=NULL WHERE id=$1`,[current.id]);await client.query('COMMIT');return {status:'unchanged' as const};}
  if(current){await client.query(`INSERT INTO assistant_memory_history(gym_id,student_id,assistant,memory_key,memory_id,old_value,new_value,source_detail,change_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'updated')`,[scope.gym,scope.student,agent,candidate.key,current.id,current.memory_value,candidate.value,candidate.sourceDetail]);await client.query(`UPDATE assistant_memories SET active=false,valid_until=now(),updated_at=now() WHERE id=$1`,[current.id]);const row=(await client.query(`INSERT INTO assistant_memories(gym_id,student_id,assistant,memory_key,memory_value,category,confidence,source,source_detail,fact_status,valid_from,supersedes_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'confirmed',now(),$10) RETURNING id`,[scope.gym,scope.student,agent,candidate.key,candidate.value,candidate.category,candidate.confidence,candidate.source,candidate.sourceDetail,current.id])).rows[0];await client.query(`INSERT INTO assistant_memory_history(gym_id,student_id,assistant,memory_key,memory_id,new_value,source_detail,change_type) VALUES($1,$2,$3,$4,$5,$6,$7,'created')`,[scope.gym,scope.student,agent,candidate.key,row.id,candidate.value,candidate.sourceDetail]);}
  else {const row=(await client.query(`INSERT INTO assistant_memories(gym_id,student_id,assistant,memory_key,memory_value,category,confidence,source,source_detail,fact_status,valid_from) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'confirmed',now()) RETURNING id`,[scope.gym,scope.student,agent,candidate.key,candidate.value,candidate.category,candidate.confidence,candidate.source,candidate.sourceDetail])).rows[0];await client.query(`INSERT INTO assistant_memory_history(gym_id,student_id,assistant,memory_key,memory_id,new_value,source_detail,change_type) VALUES($1,$2,$3,$4,$5,$6,$7,'created')`,[scope.gym,scope.student,agent,candidate.key,row.id,candidate.value,candidate.sourceDetail]);}
  await client.query('COMMIT');return {status:current?'updated':'created' as const};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function searchKnowledge(executor:any,agent:AgentId,question:string,limit=4){
 const terms=[...new Set(normalize(clean(question,500)).match(/[a-z0-9]{3,}/g)||[])].slice(0,12);if(!terms.length)return[];
 const aliases:Record<string,string[]>={arroz:['rice'],rice:['arroz'],cozido:['cooked'],cooked:['cozido'],calorias:['kcal','calorie','calories'],calorie:['kcal','calorias'],calories:['kcal','calorias'],proteina:['protein'],protein:['proteina'],treino:['training','resistance'],training:['treino','resistance'],forca:['strength'],strength:['forca'],atividade:['activity'],physical:['atividade','activity'],adults:['adulto','adultos'],adulto:['adults'],adultos:['adults']};
 const expanded=[...new Set([...terms,...terms.flatMap(term=>aliases[term]||[])])];
 // English aliases deliberately target the English-language licensed records currently seeded; other queries remain exact-lexeme searches.
 const tsquery=expanded.map(x=>x.replace(/[^a-z0-9_]/g,'')).filter(Boolean).join(' | ');if(!tsquery)return[];
 const {rows}=await executor.query(`SELECT id,agent,category,title,content,source_name,source_url,author_institution,license_name,source_detail,incorporated_at,review_status,record_type,data_per_100g,ts_rank(search_vector,to_tsquery('simple',$2)) AS relevance FROM assistant_knowledge WHERE agent=$1 AND review_status='reviewed' AND search_vector @@ to_tsquery('simple',$2) ORDER BY relevance DESC,incorporated_at DESC LIMIT $3`,[agent,tsquery,Math.max(1,Math.min(6,limit))]);return rows;
}
