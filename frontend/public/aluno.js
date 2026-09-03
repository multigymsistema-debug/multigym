const API = 'https://multigym-api.onrender.com';
const screens = [...document.querySelectorAll('.screen')];
const loginForm = document.querySelector('#studentLoginForm');
const loginError = document.querySelector('#loginError');
const token = () => localStorage.getItem('multigym_student_token');

function setAuthenticated(value) {
  document.body.classList.toggle('authenticated', value);
}

async function loginStudent(event) {
  event.preventDefault();
  loginError.style.display = 'none';
  const button = loginForm.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch(`${API}/student-auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ gymSlug: document.querySelector('#gymSlug').value.trim(), email: document.querySelector('#studentEmail').value.trim(), password: document.querySelector('#studentPassword').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
    localStorage.setItem('multigym_student_token', data.token);
    setAuthenticated(true);
    await loadStudentData();
  } catch (error) { loginError.textContent = error.message; loginError.style.display = 'block'; }
  finally { button.disabled = false; }
}
loginForm?.addEventListener('submit', loginStudent);
if (token()) setAuthenticated(true);

// Quando houver uma sessão real, atualiza o protótipo com os dados do aluno.
async function loadStudentData() {
  const token = localStorage.getItem('multigym_student_token');
  if (!token) return;
  try {
    const response = await fetch(`${API}/student-api/home`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const data = await response.json();
    renderRealData(data);
    const name = data.student?.name || 'Aluno';
    const hello = document.querySelector('.hello strong');
    if (hello) hello.textContent = name;
    const profileName = document.querySelector('.profile-card strong');
    if (profileName) profileName.textContent = name;
    const gym = document.querySelector('.eyebrow');
    if (gym && data.student?.gymName) gym.textContent = data.student.gymName.toUpperCase();
    const plan = document.querySelector('.info-card:nth-of-type(2) strong');
    if (plan && data.enrollment?.plan_name) plan.textContent = data.enrollment.plan_name;
    const expiry = document.querySelector('.info-card:nth-of-type(2) small');
    if (expiry && data.enrollment?.ends_on) expiry.textContent = `Vencimento: ${new Date(`${data.enrollment.ends_on}T12:00:00`).toLocaleDateString('pt-BR')}`;
  } catch { /* mantém a tela demonstrativa se a API estiver indisponível */ }
}
loadStudentData();
let studentHome = null;
let currentWorkout = null;
let currentExercise = null;
const exerciseGuide = (name='') => { const n=name.toLowerCase(); if(n.includes('supino')) return ['🏋️','Deite-se no banco, mantenha os pés firmes no chão e desça a barra de forma controlada até o peito.']; if(n.includes('remada')) return ['🚣','Mantenha a coluna neutra, puxe a carga em direção ao abdômen e controle a volta.']; if(n.includes('agach')) return ['🦵','Mantenha o peito aberto, joelhos alinhados aos pés e desça com controle.']; if(n.includes('desenvolvimento')) return ['💪','Empurre a carga acima da cabeça sem arquear a lombar e retorne lentamente.']; if(n.includes('rosca')) return ['💪','Mantenha os cotovelos junto ao corpo e mova apenas os antebraços.']; if(n.includes('tríceps')||n.includes('triceps')) return ['🔻','Mantenha os cotovelos fixos e estenda os braços sem balançar o corpo.']; if(n.includes('abdominal')) return ['🧘','Contraia o abdômen e faça o movimento sem puxar o pescoço.']; return ['🏋️','Execute o movimento com controle, postura estável e amplitude confortável.']; };

function renderRealData(data) {
  studentHome = data;
  const workout = data.workouts?.[0];
  const hero = document.querySelector('.hero-card');
  if (hero && workout) { hero.querySelector('h2').textContent = workout.name; hero.querySelector('p').textContent = `${workout.exercises?.length || 0} exercícios · duração conforme prescrição`; }
  const workoutName=document.querySelector('#workoutName'); const workoutMeta=document.querySelector('#workoutMeta'); if(workoutName&&workout)workoutName.textContent=workout.name; if(workoutMeta&&workout)workoutMeta.textContent=`${workout.exercises?.length||0} exercícios · treino personalizado`;
  const list = document.querySelector('#screen-treino .exercise-list');
  if (list && workout) list.innerHTML = (workout.exercises || []).map((exercise, index) => `<button class="exercise" data-workout="${workout.id}" data-exercise="${exercise.id || ''}" data-name="${String(exercise.name || '').replace(/"/g, '&quot;')}"><b>${String(index + 1).padStart(2,'0')}</b><span><strong>${exercise.name || 'Exercício'}</strong><small>${exercise.sets || '—'} séries · ${exercise.reps || '—'} repetições · ${exercise.load || 'carga livre'}</small></span><i>›</i></button>`).join('') || '<p class="muted">Nenhum exercício cadastrado neste treino.</p>';
  const financeList = document.querySelector('#financeList');
  if (financeList) financeList.innerHTML = data.payments?.length ? data.payments.map(p=>`<div class="info-card"><div><strong>R$ ${Number(p.amount||0).toFixed(2).replace('.',',')}</strong><small>${p.paid_at ? new Date(p.paid_at).toLocaleDateString('pt-BR') : 'Pendente'} · ${p.method || '—'}</small></div><span class="${p.status==='paid'?'paid':'status'}">${p.status==='paid'?'Pago':'Pendente'}</span></div>`).join('') : '<p class="muted">Nenhum pagamento registrado.</p>';
  const progressList = document.querySelector('#progressList');
  if (progressList) { fetch(`${API}/student-api/progress`, {headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(rows=>{ progressList.innerHTML = rows.length ? rows.slice().reverse().map(row=>`<div class="info-card"><div><strong>${new Date(`${row.measured_at}T12:00:00`).toLocaleDateString('pt-BR')}</strong><small>Peso: ${row.weight || '—'} kg · Gordura: ${row.body_fat || '—'}%</small></div><span class="status">Avaliação</span></div>`).join('') : '<p class="muted">Nenhuma avaliação registrada.</p>'; }).catch(()=>{progressList.innerHTML='<p class="muted">Não foi possível carregar a evolução.</p>';}); }
  const workoutHistory = document.querySelector('#workoutHistory');
  if (workoutHistory) fetch(`${API}/student-api/workout-history`, {headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(rows=>{workoutHistory.innerHTML = `<h3>Histórico recente</h3>${rows.length ? rows.slice(0,6).map(r=>`<div class="history-row"><strong>${r.name}</strong><span>${new Date(r.completed_at).toLocaleDateString('pt-BR')} · concluído</span></div>`).join('') : '<p class="muted">Nenhum treino concluído ainda.</p>'}`;}).catch(()=>{});
  const appointments = document.querySelector('#screen-agenda');
  if (appointments && data.appointments) { const old = appointments.querySelectorAll('.appointment'); old.forEach(x => x.remove()); data.appointments.forEach(a => { const el=document.createElement('div'); el.className='appointment'; el.innerHTML=`<span>${new Date(a.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span><div><strong>${a.title}</strong><small>${new Date(a.starts_at).toLocaleDateString('pt-BR')}</small></div><em>Agendado</em>`; appointments.appendChild(el); }); }
}

let timerId = null;
let timerSeconds = 60;
let timerPaused = false;
function startRest(seconds=60) { clearInterval(timerId); timerSeconds=seconds; timerPaused=false; const box=document.querySelector('#restTimer'); box.hidden=false; const value=document.querySelector('#timerValue'); value.textContent=timerSeconds; timerId=setInterval(()=>{if(timerPaused)return; timerSeconds--; value.textContent=timerSeconds; if(timerSeconds<=0){clearInterval(timerId);document.querySelector('#logMessage').textContent='🔔 Descanso finalizado. Hora da próxima série!';}},1000); }
async function saveSet(event) {
  event.preventDefault();
  if (!currentWorkout || !currentExercise?.id) { document.querySelector('#logMessage').textContent = 'Este exercício ainda não possui identificação para registrar a série.'; return; }
  const payload = { exercise_id: currentExercise.id, set_number: Number(document.querySelector('#setNumber').value), weight: Number(document.querySelector('#setWeight').value), reps: Number(document.querySelector('#setReps').value) };
  try { const response=await fetch(`${API}/student-api/workouts/${currentWorkout.id}/logs`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify(payload)}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Não foi possível salvar a série.'); document.querySelector('#logMessage').textContent=`✓ Série ${data.set_number} concluída!`; startRest(Number(currentExercise.rest||60)); } catch(error) { const queue=JSON.parse(localStorage.getItem('multigym_offline_logs')||'[]'); queue.push({workoutId:currentWorkout.id,payload}); localStorage.setItem('multigym_offline_logs',JSON.stringify(queue)); document.querySelector('#logMessage').textContent='Sem conexão: série guardada e será sincronizada depois.'; }
}
document.querySelector('#logSetForm')?.addEventListener('submit', saveSet);
document.querySelector('#pauseTimer')?.addEventListener('click',()=>{timerPaused=!timerPaused;document.querySelector('#pauseTimer').textContent=timerPaused?'Continuar':'Pausar';});
document.querySelector('#skipTimer')?.addEventListener('click',()=>{clearInterval(timerId);document.querySelector('#restTimer').hidden=true;});
document.querySelector('#showDemo')?.addEventListener('click',()=>{const guide=exerciseGuide(currentExercise?.name||'');document.querySelector('#demoFigure').textContent=guide[0];document.querySelector('#demoText').textContent=guide[1];document.querySelector('#demoBox').hidden=false;});
document.querySelector('#closeDemo')?.addEventListener('click',()=>document.querySelector('#demoBox').hidden=true);
window.addEventListener('online', async()=>{const queue=JSON.parse(localStorage.getItem('multigym_offline_logs')||'[]');const rest=[];for(const item of queue){try{const r=await fetch(`${API}/student-api/workouts/${item.workoutId}/logs`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify(item.payload)});if(!r.ok)rest.push(item);}catch{rest.push(item);}}localStorage.setItem('multigym_offline_logs',JSON.stringify(rest));});
document.querySelector('#completeWorkout')?.addEventListener('click', async () => { if (!currentWorkout) return; try { const r=await fetch(`${API}/student-api/workouts/${currentWorkout.id}/complete`,{method:'POST',headers:{Authorization:`Bearer ${token()}`}}); const data=await r.json(); if(!r.ok) throw new Error(data.error||'Não foi possível concluir o treino.'); document.querySelector('#logMessage').textContent='Treino concluído e registrado no histórico.'; } catch(error) { document.querySelector('#logMessage').textContent=error.message; } });
const nav = [...document.querySelectorAll('.bottom-nav button')];
function showScreen(name) {
  const target = document.getElementById(`screen-${name}`);
  if (!target) return;
  screens.forEach(screen => screen.classList.toggle('active', screen === target));
  nav.forEach(button => button.classList.toggle('active', button.dataset.screen === name || (name === 'treino-exercicio' && button.dataset.screen === 'treino')));
  const titles = {home:'Início',treino:'Treinos','treino-exercicio':'Treino',agenda:'Agenda',perfil:'Perfil',evolucao:'Evolução',finance:'Financeiro',checkin:'Check-in'};
  document.getElementById('pageTitle').textContent = titles[name] || 'MultiGym';
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelector('#studentCheckin')?.addEventListener('click', async () => {
  const message = document.querySelector('#checkinMessage');
  try { const response=await fetch(`${API}/student-api/checkins`,{method:'POST',headers:{Authorization:`Bearer ${token()}`}}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Não foi possível fazer o check-in.'); message.textContent=data.already?'Você já fez check-in hoje.':'Check-in realizado com sucesso.'; } catch(error) { message.textContent=error.message; }
});
document.querySelector('#studentLogout')?.addEventListener('click', async () => {
  try { await fetch(`${API}/student-api/logout`, { method:'POST', headers:{Authorization:`Bearer ${token()}`} }); } catch {}
  localStorage.removeItem('multigym_student_token');
  setAuthenticated(false);
});
document.addEventListener('click', event => {
  const exercise = event.target.closest('[data-exercise]');
  if (exercise) { currentWorkout = studentHome?.workouts?.find(w => w.id === exercise.dataset.workout); currentExercise = currentWorkout?.exercises?.find(e => String(e.id) === String(exercise.dataset.exercise)) || {id: exercise.dataset.exercise, name: exercise.dataset.name}; document.querySelector('#exerciseTitle').textContent = currentExercise.name || 'Exercício'; document.querySelector('#exerciseProgress').textContent = `${currentWorkout?.name || 'Treino'} · carga prescrita: ${currentExercise.load || 'livre'}`; const guide=exerciseGuide(currentExercise.name); document.querySelector('#exerciseIllustration').textContent=guide[0]; document.querySelector('#exerciseInstructions span').textContent=guide[1]; document.querySelector('#exerciseHistory').innerHTML = '<p class="muted">Carregando histórico...</p>'; fetch(`${API}/student-api/workouts/${currentWorkout.id}/logs`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(rows=>{const mine=rows.filter(r=>String(r.exercise_id)===String(currentExercise.id));document.querySelector('#exerciseHistory').innerHTML=mine.length?`<div class="info-card"><div><strong>Últimas séries</strong><small>${mine.slice(0,5).map(r=>`${r.set_number}ª · ${r.weight} kg × ${r.reps}`).join('  |  ')}</small></div></div>`:'<p class="muted">Nenhuma série registrada ainda.</p>';}).catch(()=>{}); showScreen('treino-exercicio'); return; }
  const button = event.target.closest('[data-screen]');
  if (button) { if(button.dataset.screen==='treino-exercicio' && !currentExercise && studentHome?.workouts?.[0]) { currentWorkout=studentHome.workouts[0]; currentExercise=currentWorkout.exercises?.[0]; document.querySelector('#exerciseTitle').textContent=currentExercise?.name||'Exercício'; const guide=exerciseGuide(currentExercise?.name); document.querySelector('#exerciseIllustration').textContent=guide[0]; document.querySelector('#exerciseInstructions span').textContent=guide[1]; } showScreen(button.dataset.screen); }
});
