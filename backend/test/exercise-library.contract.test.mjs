import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../schema/022_exercise_catalog_seed.sql',import.meta.url),'utf8');
const frontend=fs.readFileSync(new URL('../../frontend/src/main.tsx',import.meta.url),'utf8');
const exerciseMedia=fs.readFileSync(new URL('../../frontend/src/exerciseMedia.ts',import.meta.url),'utf8');
const studentPortal=fs.readFileSync(new URL('../../frontend/src/nutrigym.tsx',import.meta.url),'utf8');
const exerciseStyles=fs.readFileSync(new URL('../../frontend/src/styles.css',import.meta.url),'utf8');
const abdutoraVideo=fs.readFileSync(new URL('../../frontend/public/exercises/abdutora.mp4',import.meta.url));

test('biblioteca completa é semeada uma vez e sem sobrescrever exercícios editados',()=>{
  assert.match(server,/const EXERCISE_CATALOG_VERSION=3/);
  assert.match(server,/await ensureExerciseLibrary\(gym\.id,client\)/);
  assert.match(server,/await ensureAllExerciseLibraries\(\)/);
  assert.ok(server.includes("UPDATE exercises SET illustration_url=$1 WHERE gym_id=$2 AND lower(trim(name))=ANY($3::text[])") );
  assert.ok(server.includes("AND (illustration_url IS NULL OR illustration_url='')"),'nunca substitui uma ilustração personalizada já existente');
  assert.ok(server.includes("['/exercises/abdutora.mp4',gym,['abdução de quadril','abdutora','cadeira abdutora']]") );
  assert.ok(server.includes('if(storedVersion<3)'));
  assert.match(server,/await deactivateDuplicateExerciseAliases\(\)/);
  assert.match(server,/UPDATE exercises e SET active=false FROM duplicates d/);
  assert.match(server,/ON CONFLICT\(gym_id,name\) DO NOTHING/);
  assert.match(server,/WHERE COALESCE\(v\.version,0\)<\$1/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS gym_exercise_catalog_versions/);
});

test('catálogo inclui as variações pedidas e não repete nomes',()=>{
  const match=server.match(/const exerciseCatalog=\[([\s\S]*?)\]\.map\(/);
  assert.ok(match,'exerciseCatalog encontrado');
  const names=[...match[1].matchAll(/\[\s*(?:'([^']+)'|"([^"]+)")/g)].map(x=>x[1]||x[2]);
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  assert.equal(names.length,135);
  assert.equal(new Set(names.map(normalize)).size,names.length);
  for(const name of ['Crucifixo com halteres','Puxada frontal com pegada neutra','Adução de quadril na máquina','Elevação de panturrilhas no leg press','Circuito de exercícios com peso corporal','Supino inclinado com halteres','Crucifixo na máquina','Remada baixa sentada','Rosca direta com barra'])assert.ok(names.includes(name),`faltou ${name}`);
  for(const duplicate of ['Supino inclinado','Crucifixo','Remada baixa','Rosca direta'])assert.ok(!names.includes(duplicate),`duplicata permaneceu: ${duplicate}`);
});

test('configurações filtram exercícios pelo nome sem diferenciar acentos',()=>{
  assert.match(frontend,/Pesquisar exercício pelo nome/);
  assert.match(frontend,/retiredDuplicateExerciseAliases\.has\(normalizeExerciseSearch\(row\.name\)\)/);
  assert.match(frontend,/visibleExerciseChoices\(rows\)/);
  assert.match(frontend,/get<any\[]>\('\/exercises\?include_media=false'\)\.then\(data=>setEx\(visibleExerciseChoices\(data\)\)\)/);
  assert.match(frontend,/get<any\[]>\('\/exercises\?include_media=true'\)\.then\(setRows\)/);
  assert.ok(server.includes("const columns=table==='exercises'&&!includeMedia?'id,gym_id,name,muscle_group,equipment,difficulty,instructions,active,created_at':'*'"));
  assert.match(frontend,/normalizeExerciseSearch\(row\.name\)\.includes\(normalizeExerciseSearch\(search\)\)/);
  assert.match(frontend,/filteredRows\.map\(row=>/);
});

test('catálogo e sessão do aluno usam as mesmas ilustrações e reproduzem vídeos',()=>{
  assert.match(exerciseMedia,/'abducao de quadril':'\/exercises\/abdutora\.mp4'/);
  assert.match(exerciseMedia,/'abdutora':'\/exercises\/abdutora\.mp4'/);
  assert.match(exerciseMedia,/'cadeira abdutora':'\/exercises\/abdutora\.mp4'/);
  assert.ok(exerciseMedia.includes('data:video\\/'));
  assert.match(frontend,/import \{isExerciseVideo,standardExerciseImage\} from '\.\/exerciseMedia'/);
  assert.match(studentPortal,/exercise\.illustration_url\|\|standardExerciseImage\(exercise\.name\)/);
  assert.ok(server.includes("'illustration_url',x.illustration_url"),'as rotas do aluno recebem a mídia do exercício cadastrado');
  assert.ok(studentPortal.includes('<video src={asset} controls playsInline preload="metadata"'));
  assert.ok(exerciseStyles.includes('.exercise-illustration.realistic img{'));
  assert.ok(exerciseStyles.includes('.exercise-illustration.realistic video{display:block;width:100%;height:auto;aspect-ratio:auto;'));
  assert.ok(exerciseStyles.includes('.session-exercise .exercise-illustration{min-height:0}'));
  assert.ok(studentPortal.includes('<img src={asset} alt={`Execução de ${exercise.name}: início e final`}/>'));
  assert.ok(studentPortal.includes('Ilustração não cadastrada no catálogo'));
  assert.ok(!studentPortal.includes('Iniciar demonstração'));
  assert.ok(!studentPortal.includes('animation-toggle'));
  assert.ok(exerciseStyles.includes('.student-session-head h1{font-size:18px'));
  assert.ok(exerciseStyles.includes('.student-session-head p{font-size:11px'));
  assert.match(frontend,/<video src=\{preview\} controls playsInline/);
  assert.match(frontend,/<video src=\{media\} controls playsInline/);
  assert.ok(abdutoraVideo.length>0);
  assert.ok(abdutoraVideo.includes(Buffer.from('avc1')),'MP4 usa codec de vídeo compatível');
});

test('edição de exercício não depende de coluna updated_at inexistente',()=>{
  assert.ok(server.includes("const updatedAtClause=table==='exercises'?'':',updated_at=now()'"));
  assert.ok(server.includes('SET ${sets}${updatedAtClause} WHERE id=$'));
});

test('cadastro e edição aceitam fotos e vídeos com limites seguros',()=>{
  assert.match(frontend,/accept="image\/png,image\/jpeg,image\/webp,video\/mp4,video\/webm"/);
  assert.match(frontend,/const readMedia=/);
  assert.match(frontend,/file\.size>maxSize/);
  assert.match(frontend,/isVideo\?4\*1024\*1024:900\*1024/);
  assert.ok(server.includes('const isValidExerciseMedia='));
  assert.ok(server.includes('value.length<=5_600_000'));
  assert.ok(server.includes('exerciseMediaAuditValue(b.illustration_url)'));
  assert.ok(server.includes('isValidExerciseMedia(b.illustration_url)'));
});

test('layout móvel mantém abas, ações e cartões dentro da viewport',()=>{
  assert.ok(exerciseStyles.includes('.tabs{width:100%;max-width:100%;overflow-x:auto;'));
  assert.ok(exerciseStyles.includes('.profile-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(exerciseStyles.includes('.profile-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(exerciseStyles.includes('.student-header nav button{flex:0 0 auto}'));
  assert.ok(exerciseStyles.includes('.table-card{overflow-x:auto}'));
});
