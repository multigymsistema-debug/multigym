type NutritionContext={
  profile:any;
  meals:any[];
  goals:any[];
  checkin:any;
  workouts:any[];
  plan:any;
};

const MODEL=process.env.GROQ_MODEL||'openai/gpt-oss-20b';
const timeoutMs=Number(process.env.GROQ_TIMEOUT_MS||12000);
const unsafeOutput=/\b(diagnos(ticar|tico)|prescri(ba|ver)|medica(mento|ção)|insulina|suspenda|pare de tomar|dose exata|jejum extremo|vomit|laxante)\b/i;
const safetyMessage='Posso ajudar a organizar sua alimentação e seus registros, mas não faço diagnóstico nem prescrevo tratamento. Para uma orientação clínica ou para alterar seu plano, procure seu nutricionista ou médico.';

export async function askGroqNutrition(message:string,context:NutritionContext):Promise<string|null>{
  const key=process.env.GROQ_API_KEY;
  if(!key)return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const system=`Você é o assistente NutriGym, parte de uma plataforma de acompanhamento nutricional. Responda em português brasileiro, de forma breve, acolhedora e prática. Você NÃO é nutricionista e não substitui profissionais. Nunca diagnostique, prescreva tratamento, altere medicamento, recomende dietas extremas ou ignore alergias/restrições. Nunca altere silenciosamente um plano profissional: explique e encaminhe ao nutricionista. Use somente o contexto autorizado recebido. Não invente dados, calorias, alimentos registrados ou horários. Não use linguagem de culpa. Se faltar informação, diga isso e sugira registrar ou consultar o profissional. Se o pedido envolver risco clínico, recuse a parte clínica e oriente ajuda profissional. Contexto autorizado: ${JSON.stringify(context)}`;
  try{
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,temperature:0.2,max_tokens:450,messages:[{role:'system',content:system},{role:'user',content:message.slice(0,500)}]}),signal:controller.signal});
    if(!response.ok)return null;
    const data:any=await response.json();
    const text=String(data?.choices?.[0]?.message?.content||'').trim();
    if(!text||text.length>3000||unsafeOutput.test(text))return safetyMessage;
    return text;
  }catch{return null}finally{clearTimeout(timer)}
}
