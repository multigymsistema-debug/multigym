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
const nav = [...document.querySelectorAll('.bottom-nav button')];
function showScreen(name) {
  const target = document.getElementById(`screen-${name}`);
  if (!target) return;
  screens.forEach(screen => screen.classList.toggle('active', screen === target));
  nav.forEach(button => button.classList.toggle('active', button.dataset.screen === name || (name === 'treino-exercicio' && button.dataset.screen === 'treino')));
  const titles = {home:'Início',treino:'Treinos','treino-exercicio':'Treino',agenda:'Agenda',perfil:'Perfil',evolucao:'Evolução'};
  document.getElementById('pageTitle').textContent = titles[name] || 'MultiGym';
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelector('#studentLogout')?.addEventListener('click', async () => {
  try { await fetch(`${API}/student-api/logout`, { method:'POST', headers:{Authorization:`Bearer ${token()}`} }); } catch {}
  localStorage.removeItem('multigym_student_token');
  setAuthenticated(false);
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-screen]');
  if (button) showScreen(button.dataset.screen);
});
