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
  const selectedTools=Array.isArray(context?.tool_results)?context.tool_results:[];
  const toolData=(name:string)=>selectedTools.find((entry:any)=>entry?.tool===name&&entry.status==='ok')?.data;
  const toolFailure=selectedTools.some((entry:any)=>entry?.status!=='ok');
  const actualMeals=toolData('read_confirmed_meals');
  const hasMealTool=selectedTools.some((entry:any)=>entry?.tool==='read_confirmed_meals');
  const actualGoals=toolData('read_nutrition_goals');
  const actualHydration=toolData('read_confirmed_hydration')??toolData('read_hydration_records');
  const actualWeights=toolData('read_weight_history');
  switch(context?.intent){
    case 'GREETING': return `${hello}estou aqui para acompanhar sua alimentação e seus registros. Posso resumir seu dia, conferir hidratação ou ajudar a organizar uma meta.`;
    case 'HYDRATION': {
      if(toolFailure)return `${hello}não consegui consultar seus registros de hidratação agora; não vou presumir os valores.`;
      const rows=Array.isArray(actualHydration)?actualHydration:[];
      const today=String(nut.today||new Date().toISOString().slice(0,10));
      const amount=rows.filter((x:any)=>String(x.hydration_date||'').slice(0,10)===today).reduce((sum:number,x:any)=>sum+n(x.amount_ml),0);
      return waterGoal?`${hello}consultei seus registros: há ${fmt(amount)} ml lançados hoje, frente à meta cadastrada de ${fmt(waterGoal)} ml. Isso reflete somente o que foi registrado.`:`${hello}consultei seus registros, mas seu perfil não tem uma meta de água cadastrada.`;
    }
    case 'DAILY_SUMMARY': {
      if(toolFailure)return `${hello}não consegui consultar seus registros de alimentação e hidratação agora; não vou preencher as lacunas com estimativas.`;
      const meals=hasMealTool&&Array.isArray(actualMeals)?actualMeals:Array.isArray(nut.meals)?nut.meals:[];
      const today=String(nut.today||new Date().toISOString().slice(0,10));
      const todayMeals=meals.filter((meal:any)=>String(meal.meal_date||'').slice(0,10)===today);
      const calories=hasMealTool?todayMeals.reduce((sum:number,meal:any)=>sum+n(meal.calories),0):n(totals.calories);
      const protein=hasMealTool?todayMeals.reduce((sum:number,meal:any)=>sum+n(meal.protein_g),0):n(totals.protein_g);
      const lines=[`${hello}${hasMealTool?'consultei ':''}no registro de hoje há ${hasMealTool?todayMeals.length:(Array.isArray(nut.meals)?nut.meals.length:0)} refeição(ões), somando ${fmt(calories)} kcal e ${fmt(protein,1)} g de proteína anotada.`];
      if(waterGoal)lines.push(`A água registrada soma ${fmt(waterToday)} ml de ${fmt(waterGoal)} ml da meta do perfil.`);
      lines.push('Os valores dependem do que foi registrado e, quando estimados, podem não representar exatamente o consumo.');
      return lines.join(' ');
    }
    case 'PROGRESS': {
      if(toolFailure)return `${hello}não consegui consultar seus registros de peso agora; não vou presumir uma tendência.`;
      const checks=Array.isArray(actualWeights)?actualWeights.filter((x:any)=>n(x.weight_kg)>0):Array.isArray(nut.checkin_history)?nut.checkin_history.filter((x:any)=>n(x.weight_kg)>0):[];
      if(checks.length>=2){const latest=checks[0],oldest=checks.at(-1),delta=n(latest.weight_kg)-n(oldest.weight_kg);return `${hello}seus registros de peso vão de ${fmt(oldest.weight_kg,1)} kg (${oldest.checkin_date}) a ${fmt(latest.weight_kg,1)} kg (${latest.checkin_date}), uma diferença registrada de ${delta>0?'+':''}${fmt(delta,1)} kg. Isso descreve apenas os check-ins disponíveis, não determina sozinho mudanças de saúde ou composição corporal.`;}
      return `${hello}ainda há poucos check-ins de peso para comparar uma tendência. Continue registrando em condições semelhantes; posso resumir a evolução quando houver mais de um registro.`;
    }
    case 'GOAL': {
      if(toolFailure)return `${hello}não consegui consultar suas metas agora. Tente novamente mais tarde; não vou estimar metas ausentes.`;
      const objective=p.objective||context?.student?.primary_goal;
      const targets=actualGoals?.profileTargets||p;
      const explicitGoals=Array.isArray(actualGoals?.goals)?actualGoals.goals:[];
      const calorieGoal=target(targets.calories_goal,'kcal'),proteinGoal=target(targets.protein_goal_g,'g');
      const namedGoals=explicitGoals.map((goal:any)=>`${goal.goal_type}: ${fmt(goal.value,1)} ${goal.unit} (${goal.period})`).join('; ');
      return `${hello}${objective?`seu objetivo registrado é ${String(objective)}.`:'ainda não há um objetivo registrado no perfil.'}${calorieGoal?` Sua meta cadastrada é ${calorieGoal} por dia.`:''}${proteinGoal?` A meta de proteína registrada é ${proteinGoal}.`:''}${namedGoals?` Outras metas registradas: ${namedGoals}.`:''} Posso ajudar a acompanhar esses dados e organizar perguntas para seu nutricionista; eles não substituem uma avaliação profissional.`;
    }
    case 'RECOMMENDATION': {
      const remembered=Array.isArray(context?.memory_notes)?context.memory_notes.find((row:any)=>row.category==='preference'&&row.memory_key==='food_preference'):null;
      const restrictions=[p.allergies,p.restrictions].filter(Boolean).join('; ');
      if(restrictions)return `${hello}seu perfil registra alergias/restrições (${String(restrictions).slice(0,180)}). Sem uma checagem confiável de ingredientes, não vou sugerir um alimento específico. Posso ajudar a conferir opções que você já sabe serem seguras ou organizar seu plano profissional.`;
      if(remembered)return `${hello}vou considerar sua preferência alimentar registrada — ${String(remembered.memory_value)} — ao personalizar ideias. Diga o que tem disponível e confira os ingredientes, especialmente se houver alergia ou restrição.`;
      if(p.dislikes)return `${hello}posso personalizar uma opção considerando seus alimentos favoritos, rotina e orçamento, mas não consigo confirmar ingredientes ou porções sem mais detalhes. Diga quais alimentos você tem disponíveis e a quantidade aproximada.`;
      return `${hello}para sugerir algo realmente adequado, preciso saber quais alimentos você tem disponíveis e se há alergias ou restrições que ainda não estejam no perfil. Posso então ajudar a organizar uma opção prática, sem substituir orientação nutricional.`;
    }
    case 'MEAL_ANALYSIS': return `${hello}o reconhecimento de foto é feito localmente no aparelho. Confirme ou corrija os alimentos sugeridos e informe as porções; a imagem não permite medir com precisão ingredientes ou calorias.`;
    case 'MEAL_REGISTRATION': return `${hello}posso organizar o registro da refeição. Informe os alimentos e, se souber, as quantidades; valores sem quantidade serão apenas estimativas.`;
    case 'PROFESSIONAL_REFERRAL': return 'Posso organizar seus registros e dúvidas, mas diagnóstico, tratamento, medicamentos ou prescrição precisam ser avaliados por um profissional de saúde.';
    case 'QUESTION': {
      if(selectedTools.some((entry:any)=>entry?.status!=='ok'&&entry.tool!=='read_food_composition'))return `${hello}não consegui consultar todos os registros necessários agora; não vou apresentar uma análise incompleta como se fosse completa.`;
      const knowledge=Array.isArray(context?.knowledge)?context.knowledge:[];
      if(/arroz|rice/i.test(String(context?.question||''))&&!/semana|historico|histórico|consumi|consumo|comi/i.test(String(context?.question||''))){const item=knowledge.find((row:any)=>row.record_type==='food_composition');if(item)return `${hello}${item.title}: ${item.content} Fonte: ${item.source||item.source_name} (${item.source_url||''}). Se o alimento/preparo não corresponder exatamente ao registro, não use esses valores como equivalentes.`;}
      if(/comer|aliment|nutri|refeic|dieta/i.test(String(context?.question||''))&&!/semana|historico|histórico|consumi|consumo|comi/i.test(String(context?.question||''))&&knowledge.length)return `${hello}${knowledge.slice(0,2).map((row:any)=>`${row.title}: ${row.content} Fonte: ${row.source||row.source_name} (${row.source_url||''}).`).join(' ')} Isso é conhecimento geral revisado, não um plano individual.`;
      if(/comer|aliment|nutri|refeic|dieta|arroz|alimento|nutriente|caloria|proteina|proteína/i.test(String(context?.question||''))&&!/semana|historico|histórico|consumi|consumo|comi/i.test(String(context?.question||''))&&!knowledge.length)return `${hello}não encontrei conhecimento revisado suficientemente pertinente na base disponível para responder com segurança. Posso consultar seus registros oficiais, mas não vou inventar referências ou valores.`;
      if(/alimento|composicao|nutriente|caloria de|macro/i.test(String(context?.question||''))){const unavailable=selectedTools.find((entry:any)=>entry.tool==='read_food_composition');return unavailable?.limitation||`${hello}não há tabela nutricional estruturada disponível para este alimento; não vou inventar valores.`;}
      if(/aliment|refeic|semana|proteina|proteína|comi|consumo/i.test(String(context?.question||''))) {
        const rows=Array.isArray(actualMeals)?actualMeals:[];
        if(!rows.length)return `${hello}consultei as refeições registradas e não encontrei lançamentos no histórico disponível. Sem registros não dá para avaliar sua alimentação da semana nem afirmar consumo de proteína.`;
        const protein=rows.reduce((sum:number,m:any)=>sum+n(m.protein_g),0);
        return `${hello}consultei ${rows.length} refeição(ões) registrada(s). A soma de proteína lançada nesses registros é ${fmt(protein,1)} g; isso cobre somente as refeições anotadas no histórico retornado, não necessariamente toda a sua semana.`;
      }
      if(/peso|evolu|emagrec|engord/i.test(String(context?.question||''))){const rows=Array.isArray(actualWeights)?actualWeights:[];if(!rows.length)return `${hello}consultei os check-ins e não encontrei registros de peso para comparar.`;return `${hello}consultei ${rows.length} registro(s) de peso. Para uma tendência confiável, é melhor comparar datas e condições de medição; esses dados não permitem diagnóstico.`;}
      if(/hidrat|agua|água/i.test(String(context?.question||''))){const rows=Array.isArray(actualHydration)?actualHydration:[];return rows.length?`${hello}consultei ${rows.length} dia(s) com hidratação registrada. Posso comparar os totais com a meta cadastrada, considerando apenas os lançamentos.`:`${hello}consultei os registros de hidratação e não encontrei lançamentos disponíveis.`;}
      return `${hello}consultei seus dados autorizados, mas não encontrei registros suficientes para responder sem inferir informações.`;
    }
    default: return `${hello}posso consultar seus registros de alimentação, hidratação, metas e check-ins. Vou distinguir o que foi registrado de qualquer estimativa.`;
  }
}

export function personalFallback(context:any):string{
  const training=context?.training||{},profile=context?.profile||{},name=firstName(context),hello=name?`${name}, `:'';
  const workouts=Array.isArray(training.active_workouts)?training.active_workouts:[],workout=workouts[0],exercises=Array.isArray(workout?.exercises)?workout.exercises:[],logs=Array.isArray(training.logs)?training.logs:[];
  const selectedTools=Array.isArray(context?.tool_results)?context.tool_results:[];
  const toolData=(name:string)=>selectedTools.find((entry:any)=>entry?.tool===name&&entry.status==='ok')?.data;
  const toolFailure=selectedTools.some((entry:any)=>entry?.status!=='ok');
  const profileData=toolData('read_student_training_profile');
  const actualWorkout=toolData('read_active_workout_catalog')?.[0]||workout;
  const actualHistory=Array.isArray(toolData('read_workout_history'))?toolData('read_workout_history'):[];
  const actualLogs=Array.isArray(toolData('read_confirmed_workout_performance'))?toolData('read_confirmed_workout_performance'):logs;
  switch(context?.intent){
    case 'GREETING': return `${hello}estou aqui para ajudar com o treino que sua academia cadastrou, explicar instruções disponíveis e acompanhar os registros concluídos.`;
    case 'WORKOUT_INFO':
    case 'NEXT_WORKOUT': {
      if(toolFailure)return `${hello}não consegui consultar os dados do treino agora; não vou adivinhar. Tente novamente em instantes.`;
      const remembered=Array.isArray(context?.memory_notes)?context.memory_notes.find((row:any)=>row.category==='availability'||row.category==='preference'):null;
      if(remembered&&/horario|manhã|manha|tarde|noite|prefiro|disponibilidade/i.test(norm(String(context?.question||''))))return `${hello}tenho anotado que sua preferência/disponibilidade é ${remembered.memory_value}. Se isso mudou, me avise; vou conferir o treino ativo registrado separadamente.`;
      if(/ultimo|último|ultima|última|treino anterior/i.test(norm(String(context?.question||'')))){
        const last=actualHistory[0];
        if(!last)return `${hello}consultei o histórico e não encontrei um treino concluído.`;
        const sessionLogs=actualLogs.filter((row:any)=>String(row.workout_id||'')===String(last.workout_id||''));
        if(!sessionLogs.length)return `${hello}seu treino concluído mais recente foi ${last.name||'sem nome'}, em ${String(last.completed_at||'').slice(0,10)||'data não disponível'}. Não encontrei séries/cargas confirmadas associadas a essa sessão.`;
        return `${hello}consultei seu treino concluído mais recente, ${last.name||'sem nome'}, em ${String(last.completed_at||'').slice(0,10)||'data não disponível'}. As séries registradas incluem ${sessionLogs.slice(0,10).map((row:any)=>`${row.exercise_name}: ${fmt(row.weight,1)} kg × ${fmt(row.reps)} repetições`).join('; ')}. Isso descreve somente as anotações disponíveis.`;
      }
      if(!actualWorkout)return `${hello}não encontrei um treino ativo nos seus registros. Quando a academia publicar uma sessão, posso ajudar a consultar.`;
      const actualExercises=Array.isArray(actualWorkout.exercises)?actualWorkout.exercises:[];
      return `${hello}o treino ativo é ${actualWorkout.name}${actualWorkout.objective?` (${actualWorkout.objective})`:''}. ${actualExercises.length?actualExercises.slice(0,10).map((e:any,i:number)=>`${i+1}. ${e.name}: ${e.sets||'séries não informadas'} séries, ${e.reps||'repetições não informadas'} repetições${e.rest?`, descanso ${e.rest}`:''}.`).join(' '):'A sessão não tem exercícios visíveis neste momento.'} Consultei o treino ativo registrado no MultiGym.`;
    }
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
      if(toolFailure)return `${hello}não consegui consultar seus registros de treino agora; não vou inferir desempenho sem os dados.`;
      if(!actualLogs.length){const last=actualHistory[0];return last?`${hello}seu treino concluído mais recente foi ${last.name||'sem nome registrado'}, em ${String(last.completed_at||'').slice(0,10)||'data não disponível'}. Não encontrei séries/cargas confirmadas para avaliar o desempenho dessa sessão.`:`${hello}ainda não há registros de séries executadas disponíveis para comparar.`;}
      const byExercise=new Map<string,any[]>();
      for(const log of actualLogs){const key=String(log.exercise_name||'Exercício');const arr=byExercise.get(key)||[];arr.push(log);byExercise.set(key,arr);}
      const comparisons=[...byExercise.entries()].filter(([,arr])=>arr.length>=2).slice(0,3).map(([exercise,arr])=>{const newest=arr[0],oldest=arr.at(-1);return `${exercise}: ${fmt(oldest.weight,1)} kg × ${fmt(oldest.reps)} repetições no registro mais antigo mostrado; ${fmt(newest.weight,1)} kg × ${fmt(newest.reps)} no mais recente.`;});
      return comparisons.length?`${hello}nos registros de sessões concluídas, encontrei estas comparações: ${comparisons.join(' ')} Essas anotações antigas podem conter valores preenchidos automaticamente, sem confirmação do aluno. Elas não comprovam o desempenho real nem garantem progresso físico.`:`${hello}encontrei ${logs.length} série(s) registrada(s) em treinos concluídos, mas ainda não há duas anotações do mesmo exercício para comparar. Registros antigos podem conter valores automáticos não confirmados.`;
    }
    case 'MOTIVATION': return `${hello}não precisa compensar uma sessão perdida com excesso de treino. Podemos retomar pelo treino ativo que a academia preparou e acompanhar o que você registrar, respeitando seu ritmo e qualquer orientação profissional.`;
    case 'PROFESSIONAL_REFERRAL': return 'Posso ajudar a entender o treino cadastrado, mas diagnóstico, reabilitação ou decisão sobre lesões exige avaliação de um profissional de saúde ou de educação física.';
    case 'SAFETY': return 'Interrompa o exercício agora. Se houver dor no peito, falta de ar, desmaio, tontura intensa ou perda súbita de força, procure atendimento de urgência. Não retome um movimento que provoque dor antes de conversar com um profissional.';
    case 'QUESTION': {
      if(toolFailure)return `${hello}não consegui consultar com segurança seus registros agora; não vou completar a resposta com suposições.`;
      const relevant=Array.isArray(context?.memory_notes)?context.memory_notes.find((m:any)=>m.memory_key==='training_time'||m.memory_key==='training_availability'):null;
      if(relevant&&/horario|prefer|disponibilidade/i.test(norm(context?.question)))return `${hello}tenho anotado que sua preferência ou disponibilidade é ${relevant.memory_value}. Se isso mudou, me avise.`;
      const knowledge=Array.isArray(context?.knowledge)?context.knowledge:[];
      if(/exercicio|treinamento|forca|musculo|atividade fisica/i.test(norm(String(context?.question||'')))){const item=knowledge[0];if(item)return `${hello}${item.title}: ${item.content} Fonte: ${item.source_name} — ${item.source_url}. É evidência geral para adultos e não substitui prescrição individual.`;return `${hello}não encontrei conhecimento revisado suficientemente pertinente na base atual para responder essa pergunta de treinamento com fonte verificável. Posso consultar seu treino e catálogo oficiais, mas não vou inventar evidência.`;}
      const catalog=toolData('read_active_exercise_catalog');
      if(catalog&&/exercicio|exercicios|catalogo|disponiveis/i.test(String(context?.question||'')))return catalog.length?`${hello}consultei o catálogo ativo da sua academia e encontrei: ${catalog.slice(0,12).map((e:any)=>e.name).join(', ')}.`:`${hello}consultei o catálogo ativo da sua academia e não encontrei exercícios disponíveis.`;
      if(profileData)return `${hello}consultei seu perfil registrado. Seu objetivo é ${profileData.student?.primary_goal||profileData.profile?.objective||'não informado'}; nível ${profileData.student?.training_level||'não informado'}; limitações cadastradas: ${profileData.student?.limitations||'nenhuma informada'}. Use esses dados como registro, não como avaliação clínica.`;
      if(/ultimo|último|ultima|última|ultimo treino|último treino/i.test(norm(String(context?.question||'')))){
        const last=actualHistory[0];
        if(!last)return `${hello}consultei o histórico e não encontrei um treino concluído. Sem esse registro não consigo descrever a sessão.`;
        const sessionLogs=actualLogs.filter((row:any)=>String(row.workout_name||'')===String(last.name||''));
        if(!sessionLogs.length)return `${hello}seu treino concluído mais recente registrado foi ${last.name||'sem nome'}, em ${String(last.completed_at||'').slice(0,10)||'data não disponível'}. Não há séries/cargas associadas disponíveis para avaliar como foi a execução.`;
        const lines=sessionLogs.slice(0,12).map((row:any)=>`${row.exercise_name||'Exercício'}: ${fmt(row.weight,1)} kg × ${fmt(row.reps)} repetições (série ${row.set_number})`);
        return `${hello}consultei seu treino concluído mais recente, ${last.name||'sem nome'}, de ${String(last.completed_at||'').slice(0,10)||'data não disponível'}. As anotações disponíveis são: ${lines.join('; ')}. Isso descreve os registros associados à sessão; não permite concluir sozinho sobre evolução ou qualidade da execução.`;
      }
      if(actualLogs.length)return `${hello}consultei ${actualLogs.length} série(s) registradas em sessões concluídas. Para dizer se houve evolução, preciso comparar execuções do mesmo exercício em mais de uma sessão.`;
      return `${hello}ainda não encontrei registros suficientes nos dados consultados para responder isso com segurança.`;
    }
    default: return actualWorkout?`${hello}consultei o treino ativo ${actualWorkout.name} e os registros disponíveis. Posso explicar a sessão ou comparar séries confirmadas.`:`${hello}posso consultar seu perfil e os registros de treino; não encontrei uma sessão ativa no momento.`;
  }
}
