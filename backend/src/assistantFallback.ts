const n=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
const fmt=(value:unknown,digits=0)=>n(value).toLocaleString('pt-BR',{maximumFractionDigits:digits});
const norm=(value:unknown)=>String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const firstName=(context:any)=>String(context?.student?.full_name||'').trim().split(/\s+/)[0]||'';
const target=(value:unknown,unit:string)=>n(value)>0?`${fmt(value,1)} ${unit}`:null;

export function nutritionFallback(context:any):string{
  const p=context?.profile||{},nut=context?.nutrition||{},totals=nut.totals_today||{},name=firstName(context),hello=name?`${name}, `:'';
  const waterRows=Array.isArray(nut.hydration)?nut.hydration:[];
  const waterToday=waterRows.filter((x:any)=>String(x.hydration_date||'').slice(0,10)===String(nut.today||'')).reduce((sum:number,x:any)=>sum+n(x.amount_ml),0);
  const waterGoal=n(p.water_goal_ml);
  switch(context?.intent){
    case 'GREETING': return `${hello}estou aqui para acompanhar sua alimentação e seus registros. Posso resumir seu dia, conferir hidratação ou ajudar a organizar uma meta.`;
    case 'HYDRATION': return waterGoal?`${hello}hoje você registrou ${fmt(waterToday)} ml de água, de uma meta cadastrada de ${fmt(waterGoal)} ml. ${waterToday>=waterGoal?'Você já alcançou essa meta registrada.':`Faltam ${fmt(Math.max(0,waterGoal-waterToday))} ml para ela.`} É uma comparação com o que foi anotado no MultiGym.`:`${hello}ainda não há uma meta de água cadastrada no seu perfil. Você pode registrar a quantidade consumida e ajustar a meta no perfil.`;
    case 'DAILY_SUMMARY': {
      const meals=Array.isArray(nut.meals)?nut.meals:[];
      const lines=[`${hello}no registro de hoje há ${meals.length} refeição(ões), com estimativa total de ${fmt(totals.calories)} kcal e ${fmt(totals.protein_g,1)} g de proteína.`];
      if(waterGoal)lines.push(`A água registrada soma ${fmt(waterToday)} ml de ${fmt(waterGoal)} ml da meta do perfil.`);
      lines.push('Os valores dependem do que foi registrado e, quando estimados, podem não representar exatamente o consumo.');
      return lines.join(' ');
    }
    case 'PROGRESS': {
      const checks=Array.isArray(nut.checkin_history)?nut.checkin_history.filter((x:any)=>n(x.weight_kg)>0):[];
      if(checks.length>=2){const latest=checks[0],oldest=checks.at(-1),delta=n(latest.weight_kg)-n(oldest.weight_kg);return `${hello}seus registros de peso vão de ${fmt(oldest.weight_kg,1)} kg (${oldest.checkin_date}) a ${fmt(latest.weight_kg,1)} kg (${latest.checkin_date}), uma diferença registrada de ${delta>0?'+':''}${fmt(delta,1)} kg. Isso descreve apenas os check-ins disponíveis, não determina sozinho mudanças de saúde ou composição corporal.`;}
      return `${hello}ainda há poucos check-ins de peso para comparar uma tendência. Continue registrando em condições semelhantes; posso resumir a evolução quando houver mais de um registro.`;
    }
    case 'GOAL': {
      const objective=p.objective||context?.student?.primary_goal;
      const calorieGoal=target(p.calories_goal,'kcal'),proteinGoal=target(p.protein_goal_g,'g');
      return `${hello}${objective?`seu objetivo registrado é ${String(objective)}.`:'ainda não há um objetivo registrado no perfil.'}${calorieGoal?` Sua meta cadastrada é ${calorieGoal} por dia.`:''}${proteinGoal?` A meta de proteína registrada é ${proteinGoal}.`:''} Posso ajudar a acompanhar esses dados e organizar perguntas para seu nutricionista; eles não substituem uma avaliação profissional.`;
    }
    case 'RECOMMENDATION': {
      const restrictions=[p.allergies,p.restrictions].filter(Boolean).join('; ');
      if(restrictions)return `${hello}seu perfil registra alergias/restrições (${String(restrictions).slice(0,180)}). Sem uma checagem confiável de ingredientes, não vou sugerir um alimento específico. Posso ajudar a conferir opções que você já sabe serem seguras ou organizar seu plano profissional.`;
      if(p.dislikes)return `${hello}posso personalizar uma opção considerando seus alimentos favoritos, rotina e orçamento, mas não consigo confirmar ingredientes ou porções sem mais detalhes. Diga quais alimentos você tem disponíveis e a quantidade aproximada.`;
      return `${hello}para sugerir algo realmente adequado, preciso saber quais alimentos você tem disponíveis e se há alergias ou restrições que ainda não estejam no perfil. Posso então ajudar a organizar uma opção prática, sem substituir orientação nutricional.`;
    }
    case 'MEAL_ANALYSIS': return `${hello}o reconhecimento de foto é feito localmente no aparelho. Confirme ou corrija os alimentos sugeridos e informe as porções; a imagem não permite medir com precisão ingredientes ou calorias.`;
    case 'MEAL_REGISTRATION': return `${hello}posso organizar o registro da refeição. Informe os alimentos e, se souber, as quantidades; valores sem quantidade serão apenas estimativas.`;
    case 'PROFESSIONAL_REFERRAL': return 'Posso organizar seus registros e dúvidas, mas diagnóstico, tratamento, medicamentos ou prescrição precisam ser avaliados por um profissional de saúde.';
    default: return `${hello}posso usar seus registros de alimentação, hidratação, metas e check-ins para ajudar a acompanhar sua rotina. Se você disser o que quer entender — por exemplo, o resumo de hoje ou uma meta — respondo com base nos dados disponíveis.`;
  }
}

export function personalFallback(context:any):string{
  const training=context?.training||{},profile=context?.profile||{},name=firstName(context),hello=name?`${name}, `:'';
  const workouts=Array.isArray(training.active_workouts)?training.active_workouts:[],workout=workouts[0],exercises=Array.isArray(workout?.exercises)?workout.exercises:[],logs=Array.isArray(training.logs)?training.logs:[];
  switch(context?.intent){
    case 'GREETING': return `${hello}estou aqui para ajudar com o treino que sua academia cadastrou, explicar instruções disponíveis e acompanhar os registros concluídos.`;
    case 'WORKOUT_INFO':
    case 'NEXT_WORKOUT':
      if(!workout)return `${hello}não encontrei um treino ativo no seu contexto. Quando a academia publicar uma sessão, posso ajudar a entender os exercícios e a sequência.`;
      return `${hello}o treino ativo é ${workout.name}${workout.objective?` (${workout.objective})`:''}. ${exercises.length?exercises.slice(0,10).map((e:any,i:number)=>`${i+1}. ${e.name}: ${e.sets||'séries não informadas'} séries, ${e.reps||'repetições não informadas'} repetições${e.rest?`, descanso ${e.rest}`:''}.`).join(' '):'A sessão não tem exercícios visíveis neste momento.'} Vou me limitar ao que está cadastrado pela academia.`;
    case 'EXERCISE_TECHNIQUE': {
      const query=norm(context?.question),match=exercises.find((e:any)=>query.includes(norm(e.name))||norm(e.name).split(' ').filter((x:string)=>x.length>3).some((word:string)=>query.includes(word)));
      if(match?.instructions)return `${hello}a instrução cadastrada para ${match.name} é: ${String(match.instructions).slice(0,700)} ${match.notes?`Observação do treino: ${String(match.notes).slice(0,250)}.`:''} Se a execução causar dor ou mal-estar, interrompa e procure a equipe.`;
      return `${hello}não encontrei no contexto uma instrução específica para identificar esse exercício com segurança. Confira a demonstração cadastrada no exercício ou peça orientação à equipe da academia; se me disser o nome exato, posso procurar no treino ativo.`;
    }
    case 'REST': {
      const resting=exercises.filter((e:any)=>e.rest).slice(0,5);
      if(resting.length)return `${hello}no treino ativo, os descansos cadastrados são: ${resting.map((e:any)=>`${e.name}: ${e.rest}`).join('; ')}. Para os exercícios sem intervalo informado, siga a orientação da academia e respeite sua recuperação.`;
      return `${hello}não há intervalo de descanso especificado no treino carregado. Siga a orientação do profissional da academia e retome quando estiver recuperado, sem forçar sintomas.`;
    }
    case 'TRAINING_PROGRESS': {
      if(!logs.length)return `${hello}ainda não há registros de séries associados a treinos concluídos suficientes para analisar sua evolução. Quando você registrar carga e repetições nas sessões e concluí-las, posso comparar os dados.`;
      const byExercise=new Map<string,any[]>();
      for(const log of logs){const key=String(log.exercise_name||'Exercício');const arr=byExercise.get(key)||[];arr.push(log);byExercise.set(key,arr);}
      const comparisons=[...byExercise.entries()].filter(([,arr])=>arr.length>=2).slice(0,3).map(([exercise,arr])=>{const newest=arr[0],oldest=arr.at(-1);return `${exercise}: ${fmt(oldest.weight,1)} kg × ${fmt(oldest.reps)} repetições no registro mais antigo mostrado; ${fmt(newest.weight,1)} kg × ${fmt(newest.reps)} no mais recente.`;});
      return comparisons.length?`${hello}nos registros de sessões concluídas, encontrei estas comparações: ${comparisons.join(' ')} Essas anotações antigas podem conter valores preenchidos automaticamente, sem confirmação do aluno. Elas não comprovam o desempenho real nem garantem progresso físico.`:`${hello}encontrei ${logs.length} série(s) registrada(s) em treinos concluídos, mas ainda não há duas anotações do mesmo exercício para comparar. Registros antigos podem conter valores automáticos não confirmados.`;
    }
    case 'MOTIVATION': return `${hello}não precisa compensar uma sessão perdida com excesso de treino. Podemos retomar pelo treino ativo que a academia preparou e acompanhar o que você registrar, respeitando seu ritmo e qualquer orientação profissional.`;
    case 'PROFESSIONAL_REFERRAL': return 'Posso ajudar a entender o treino cadastrado, mas diagnóstico, reabilitação ou decisão sobre lesões exige avaliação de um profissional de saúde ou de educação física.';
    case 'SAFETY': return 'Interrompa o exercício agora. Se houver dor no peito, falta de ar, desmaio, tontura intensa ou perda súbita de força, procure atendimento de urgência. Não retome um movimento que provoque dor antes de conversar com um profissional.';
    default: return workout?`${hello}estou com o treino ativo ${workout.name} e seu perfil de treino. Posso explicar os exercícios cadastrados, conferir descanso ou analisar séries registradas em sessões concluídas.`:`${hello}posso ajudar a entender seu perfil e os treinos que a academia cadastrar. Ainda não encontrei uma sessão ativa para consultar.`;
  }
}
