# MultiGym 2.0

Sistema profissional para academias pequenas e studios. Esta versão foi reconstruída com foco em operação real: alunos, matrículas, treinos, avaliações, check-in manual/facial, produtos, serviços, vendas, financeiro, caixa, agenda, relatórios, equipe e configurações.

## Estrutura
- `backend/`: API Fastify + PostgreSQL + sessões + Argon2 + proteção do template biométrico.
- `frontend/`: React + Vite, interface responsiva.
- `scripts/`: download dos modelos de reconhecimento facial.
- `docker-compose.yml`: PostgreSQL + API para desenvolvimento.

## Rodar localmente
1. `docker compose up -d db`
2. `cd backend && npm install && npm run dev`
3. Em outro terminal: `cd frontend && npm install && npm run download:face-models && npm run dev`
4. Acesse `http://localhost:5173`.

## Reconhecimento facial
O navegador captura um descriptor facial usando `@vladmandic/face-api`. O descriptor é enviado ao backend, que o cifra com AES-256-GCM antes de armazenar. O check-in compara o descriptor recebido com os templates ativos da academia.

A biometria é opcional. O sistema sempre mantém check-in manual. O fluxo exige consentimento explícito no cadastro facial e permite revogação pela API.

Antes da produção, configure uma chave aleatória de 32 bytes hex em `BIOMETRIC_ENCRYPTION_KEY`, HTTPS e política de retenção/privacidade adequada à LGPD.

## Produção
Consulte `DEPLOY.md`. O frontend pode ser publicado como site estático e a API/PostgreSQL no Render ou infraestrutura equivalente.
