export type AssistantIntent='GREETING'|'QUESTION'|'PROGRESS'|'DAILY_SUMMARY'|'RECOMMENDATION'|'MEAL_ANALYSIS'|'MEAL_REGISTRATION'|'HYDRATION'|'WORKOUT_INFO'|'EXERCISE_TECHNIQUE'|'REST'|'TRAINING_PROGRESS'|'WORKOUT_COMPLETION'|'NEXT_WORKOUT'|'MOTIVATION'|'GOAL'|'TROUBLESHOOTING'|'SAFETY'|'PROFESSIONAL_REFERRAL';

type Turn={role:'user'|'assistant';content:string};
const text=(value:any)=>String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function detectAssistantIntent(message:string,assistant:'nutrition'|'personal',image=false):AssistantIntent{
  const m=text(message);
  if(image)return 'MEAL_ANALYSIS';
  if(/\b(oi|ola|bom dia|boa tarde|boa noite|hello|hey)\b/.test(m))return 'GREETING';
  if(/dor aguda|dor forte|lesao|lesão|tontura|desmaio|falta de ar|sintoma|alergia grave|vomit|sangue/.test(m))return 'SAFETY';
  if(/nutricion|medico|médico|diagnost|tratamento|remedio|remédio|prescri/.test(m))return 'PROFESSIONAL_REFERRAL';
  if(assistant==='nutrition'){
    if(/hidrat|agua|água|ml\b|litro/.test(m))return 'HYDRATION';
    if(/comi|almocei|jantei|lanchei|refeicao|refeição|foto|prato|caloria|macro|proteina|proteína/.test(m))return /comi|almocei|jantei|lanchei|refeicao|refeição/.test(m)?'MEAL_REGISTRATION':'MEAL_ANALYSIS';
    if(/o que comer|posso comer|sugest|opcao|opção|agora|lanche/.test(m))return 'RECOMMENDATION';
    if(/meta|objetivo|estrateg|estratég|plano/.test(m))return 'GOAL';
    if(/resumo|como estou hoje|fechamento do dia|meu dia/.test(m))return 'DAILY_SUMMARY';
    if(/como estou|evolu|progresso|hoje/.test(m))return 'PROGRESS';
  }else{
    if(/proximo|próximo|amanha|amanhã|depois/.test(m))return 'NEXT_WORKOUT';
    if(/treino|exercicio|exercício|serie|série|repet|carga/.test(m))return /execu|como fazer|tecnica|técnica|postura/.test(m)?'EXERCISE_TECHNIQUE':'WORKOUT_INFO';
    if(/descanso|ritmo|intervalo|aquecimento/.test(m))return 'REST';
    if(/evolu|progresso|desempenho|historico|histórico|melhor/.test(m))return 'TRAINING_PROGRESS';
    if(/motiv|desan|constanc|falt/.test(m))return 'MOTIVATION';
    if(/conclu|terminei|finalizei/.test(m))return 'WORKOUT_COMPLETION';
  }
  return /como|qual|quanto|posso|devo|por que|porque|e\b/.test(m)?'QUESTION':'QUESTION';
}
const safeTurns=(rows:any[]):Turn[]=>rows.filter(r=>['user','assistant'].includes(r?.role)&&String(r?.content||'').trim()).slice(-10).map(r=>({role:r.role,content:String(r.content).slice(0,1200)}));
const now=()=>({iso:new Date().toISOString(),weekday:new Intl.DateTimeFormat('pt-BR',{weekday:'long'}).format(new Date())});
const compactStudent=(s:any)=>s?{full_name:s.full_name,birth_date:s.birth_date,gender:s.gender,primary_goal:s.primary_goal,weekly_frequency:s.weekly_frequency,training_level:s.training_level,limitations:s.limitations,preferences:s.preferences}:null;
const compactProfile=(p:any,assistant:'nutrition'|'personal')=>{if(!p)return null;return assistant==='nutrition'?{objective:p.objective,weight_kg:p.weight_kg,height_cm:p.height_cm,age:p.age,sex:p.sex,activity_level:p.activity_level,calories_goal:p.calories_goal,protein_goal_g:p.protein_goal_g,carbs_goal_g:p.carbs_goal_g,fat_goal_g:p.fat_goal_g,water_goal_ml:p.water_goal_ml,preferences:p.preferences,restrictions:p.restrictions,allergies:p.allergies,dislikes:p.dislikes,focus_areas:p.focus_areas,motivations:p.motivations,goal_weight_kg:p.goal_weight_kg,wake_time:p.wake_time,sleep_time:p.sleep_time,training_time:p.training_time,meals_per_day:p.meals_per_day,budget_level:p.budget_level,cooking_time:p.cooking_time}:{objective:p.objective,weight_kg:p.weight_kg,height_cm:p.height_cm,activity_level:p.activity_level,preferences:p.preferences,restrictions:p.restrictions,discomforts:p.discomforts,training_time:p.training_time};};
export function buildNutriContext(raw:any,intent:AssistantIntent,message:string,conversation:any[]=[],event?:any){
  const today=raw.today||new Date().toISOString().slice(0,10),meals=Array.isArray(raw.meals)?raw.meals:[],todayMeals=meals.filter((m:any)=>String(m.meal_date).slice(0,10)===today),sum=(key:string)=>todayMeals.reduce((n:any,m:any)=>n+Number(m[key]||0),0),nutritionNeeds=['MEAL_ANALYSIS','MEAL_REGISTRATION','HYDRATION','RECOMMENDATION','PROGRESS','DAILY_SUMMARY','GOAL','QUESTION','PROFESSIONAL_REFERRAL'].includes(intent);
  const context:any={assistant:'NutriGym',intent,question:message.slice(0,500),date_time:now(),event:event||null,student:compactStudent(raw.student),profile:compactProfile(raw.profile,'nutrition'),goals:nutritionNeeds?(raw.goals||[]):[],conversation:safeTurns(conversation),conversation_summary:raw.conversationState?.summary||''};
  if(nutritionNeeds){context.nutrition={today,meals:todayMeals.slice(0,10),recent_meals:meals.slice(0,8),totals_today:{calories:sum('calories'),protein_g:sum('protein_g'),carbs_g:sum('carbs_g'),fat_g:sum('fat_g')},hydration:(raw.hydration||[]).slice(0,8),checkin:raw.checkin||null,checkin_history:(raw.checkinHistory||[]).slice(0,6),plan:raw.plan||null,memories:[...(raw.memories||[]),...(raw.persistentMemories||[])].slice(0,12)};context.currentState={date:today,totals_today:context.nutrition.totals_today,hydration:context.nutrition.hydration[0]||null};context.recentHistory={meals:context.nutrition.recent_meals,checkins:context.nutrition.checkin_history};}
  if(intent==='PROGRESS'||intent==='GOAL')context.training_snapshot={recent_workouts:(raw.workoutHistory||[]).slice(0,5),assessments:(raw.assessments||[]).slice(0,4)};
  return context;
}
export function buildPersonalContext(raw:any,intent:AssistantIntent,message:string,conversation:any[]=[],event?:any){
  const needsTraining=['WORKOUT_INFO','EXERCISE_TECHNIQUE','REST','TRAINING_PROGRESS','NEXT_WORKOUT','WORKOUT_COMPLETION','MOTIVATION','QUESTION','SAFETY','PROFESSIONAL_REFERRAL'].includes(intent);
  const context:any={assistant:'Personal Gym',intent,question:message.slice(0,700),date_time:now(),event:event||null,student:compactStudent(raw.student),profile:compactProfile(raw.profile,'personal'),conversation:safeTurns(conversation),conversation_summary:raw.conversationState?.summary||''};
  if(needsTraining){context.training={active_workouts:(raw.workouts||[]).slice(0,3),history:(raw.workoutHistory||[]).slice(0,12),logs:(raw.logs||[]).slice(0,30),assessments:(raw.assessments||[]).slice(0,8),memories:(raw.persistentMemories||[]).slice(0,12)};context.currentState={date:raw.today||new Date().toISOString().slice(0,10),active_workout:context.training.active_workouts[0]||null,last_completion:context.training.history[0]||null};context.recentHistory={workouts:context.training.history,logs:context.training.logs.slice(0,12)};}
  if(intent==='QUESTION'||intent==='SAFETY'||intent==='MOTIVATION')context.nutrition_snapshot={recent_meals:(raw.meals||[]).slice(0,4),hydration:(raw.hydration||[]).slice(0,4)};
  return context;
}
