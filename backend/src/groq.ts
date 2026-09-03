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
const safetyMessage='Posso ajudar com a organização da sua alimentação, mas esse pedido precisa de orientação profissional. Posso ajudar a registrar o que aconteceu e organizar suas dúvidas.';

export async function askGroqNutrition(message:string,context:NutritionContext,imageDataUrl?:string):Promise<string|null>{
  const key=process.env.GROQ_API_KEY;
  if(!key)return null;
  const model=imageDataUrl?(process.env.GROQ_VISION_MODEL||'meta-llama/llama-4-scout-17b-16e-instruct'):MODEL;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const system=`Você é o assistente NutriGym, parte de uma plataforma de acompanhamento nutricional. Responda em português brasileiro, de forma breve, acolhedora e prática. Use somente o contexto autorizado recebido. Não invente dados, calorias, alimentos registrados ou horários. Não use linguagem de culpa. Respeite alergias e restrições antes de sugerir qualquer opção. Não altere silenciosamente um plano profissional. Só mencione a necessidade de profissional quando o pedido envolver diagnóstico, tratamento, medicamento, risco clínico ou mudança de plano. ${imageDataUrl?'Analise a imagem apenas de forma visual e aproximada. Liste os alimentos possivelmente identificados e forneça uma faixa de calorias, nunca um número exato. Diga que a pessoa deve confirmar ou corrigir os itens. Não trate a imagem como medição nutricional.':''} Contexto autorizado: ${JSON.stringify(context)}`;
  try{
    const userContent:any=imageDataUrl?[{type:'text',text:message.slice(0,500)},{type:'image_url',image_url:{url:imageDataUrl}}]:message.slice(0,500);
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.2,max_tokens:450,messages:[{role:'system',content:system},{role:'user',content:userContent}]}),signal:controller.signal});
    if(!response.ok)return null;
    const data:any=await response.json();
    const text=String(data?.choices?.[0]?.message?.content||'').trim();
    if(!text||text.length>3000||unsafeOutput.test(text))return safetyMessage;
    return text;
  }catch{return null}finally{clearTimeout(timer)}
}
