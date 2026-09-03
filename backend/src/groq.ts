type NutritionContext={
  profile:any;
  meals:any[];
  goals:any[];
  checkin:any;
  workouts:any[];
  plan:any;
};

const MODEL=process.env.GROQ_MODEL||'openai/gpt-oss-120b';
const timeoutMs=Number(process.env.GROQ_TIMEOUT_MS||12000);
const unsafeOutput=/\b(diagnos(ticar|tico)|prescri(ba|ver)|medica(mento|ção)|insulina|suspenda|pare de tomar|dose exata|jejum extremo|vomit|laxante)\b/i;
const safetyMessage='Posso ajudar com a organização da sua alimentação, mas esse pedido precisa de orientação profissional. Posso ajudar a registrar o que aconteceu e organizar suas dúvidas.';

export async function askGroqNutrition(message:string,context:NutritionContext,imageDataUrl?:string):Promise<string|null>{
  const key=process.env.GROQ_API_KEY;
  if(!key)return null;
  const model=imageDataUrl?(process.env.GROQ_VISION_MODEL||'meta-llama/llama-4-scout-17b-16e-instruct'):MODEL;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const planningRequest=/plano|ação|objetivo|emagrec|perder|ganhar|massa|recompos|estratégia|estrategia|meta/i.test(message);
  const system=`Você é o assistente NutriGym, uma experiência premium de acompanhamento nutricional integrada ao treino. Responda em português brasileiro, com profundidade proporcional ao pedido, tom humano, seguro, claro e profissional, sem parecer um chatbot genérico. Use somente o contexto autorizado recebido e não invente dados. Não use linguagem de culpa. Respeite alergias e restrições antes de sugerir qualquer opção. Não altere silenciosamente um plano profissional. Não repita avisos genéricos em toda resposta: só mencione a necessidade de um profissional quando o pedido envolver diagnóstico, tratamento, medicamento, risco clínico ou mudança de plano. Quando o aluno pedir um plano de ação, converse como um bom coach nutricional: confirme a meta, interprete os dados disponíveis, indique um ritmo realista sem prometer resultado e entregue ações concretas para começar: comece confirmando a meta, indique um ritmo realista sem prometer resultado, use composição corporal, medidas, hidratação e histórico de treino quando existirem, organize alimentação, treino, movimento e acompanhamento semanal, e termine com os poucos dados que ainda faltarem. Use composição corporal, medidas, hidratação e histórico de treino quando existirem. Prefira texto corrido e listas legíveis no celular; não use tabelas Markdown nem despeje todos os campos do perfil. Se um dado não existir no contexto, não invente: siga com uma orientação provisória e termine com no máximo três perguntas objetivas. Diferencie claramente o que veio dos registros do aluno do que é uma sugestão geral. Não diga para usar outro aplicativo. Quando fizer sentido, organize em 🎯 Meta; 1. Alimentação; 2. Treino; 3. Cardio e movimento; 4. Acompanhamento semanal; 5. Nossa estratégia em fases. ${planningRequest?'Para este pedido, seja completo e prático, com títulos curtos, emojis discretos, exemplos de ações e uma rotina inicial. Não pare no meio nem responda como um formulário.':''} ${imageDataUrl?'Analise a imagem apenas de forma visual e aproximada. Liste os alimentos possivelmente identificados e forneça uma faixa de calorias, nunca um número exato. Diga que a pessoa deve confirmar ou corrigir os itens. Não trate a imagem como medição nutricional.':''} Contexto autorizado: ${JSON.stringify(context)}`;
  try{
    const userContent:any=imageDataUrl?[{type:'text',text:message.slice(0,500)},{type:'image_url',image_url:{url:imageDataUrl}}]:message.slice(0,500);
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.2,max_tokens:700,messages:[{role:'system',content:system},{role:'user',content:userContent}]}),signal:controller.signal});
    if(!response.ok)return null;
    const data:any=await response.json();
    const text=String(data?.choices?.[0]?.message?.content||'').trim();
    if(!text||text.length>3000||unsafeOutput.test(text))return safetyMessage;
    return text;
  }catch{return null}finally{clearTimeout(timer)}
}
