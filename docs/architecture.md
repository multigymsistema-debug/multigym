# Arquitetura MultiGym

## Princípios
1. Toda requisição autenticada resolve `user_id` e `gym_id` a partir da sessão/token; o frontend nunca escolhe o tenant.
2. Toda consulta operacional filtra por `gym_id`; as políticas RLS são uma segunda barreira no PostgreSQL.
3. Serviços de domínio recebem o contexto autenticado, não um `gym_id` arbitrário do corpo da requisição.
4. Exclusões operacionais são preferencialmente desativação/cancelamento, preservando histórico financeiro e auditoria.
5. Valores monetários usam `numeric(12,2)` e datas são armazenadas em UTC com timezone da academia para exibição.

## Módulos
- `auth`: login, sessão, recuperação e convite de usuários.
- `gyms`: academia, preferências e planos.
- `students`: cadastro e ficha do aluno.
- `enrollments`: matrículas e ciclo de vida.
- `workouts`: fichas e exercícios.
- `payments`: recebimentos e pendências.
- `appointments`: agenda.
- `reports`: consultas agregadas read-only.
- `audit`: logs de ações importantes.

## Backend
Cada módulo terá rotas, schema de validação, service e repository. Erros serão convertidos em mensagens claras sem expor SQL, tokens ou dados de outra academia. Testes de autorização devem sempre incluir uma tentativa cross-tenant.

## Frontend
Shell autenticado com sidebar/drawer, páginas independentes e componentes de tabela/card responsivos. Estados obrigatórios: carregando, vazio, erro, sucesso e confirmação para ações destrutivas. A identidade visual usa vermelho `#C91524`, vermelho escuro `#7F0D16`, branco e cinzas neutros.

## Segurança inicial
- RLS habilitado nas tabelas de negócio.
- `SET LOCAL app.current_gym_id` definido pelo backend dentro da transação.
- Senhas nunca são armazenadas em texto puro.
- Logs não armazenam senha, token ou dados sensíveis desnecessários.
- CORS allowlist, rate limit no login, headers seguros e validação de entrada entram na etapa de autenticação.
