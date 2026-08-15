# Publicação

## API + PostgreSQL
Use `render.yaml` ou crie manualmente:
- PostgreSQL
- Web Service Node 22 apontando para `backend`
- Build: `npm install && npm run build`
- Start: `npm start`

Variáveis obrigatórias:
- `DATABASE_URL`
- `FRONTEND_URL`
- `BIOMETRIC_ENCRYPTION_KEY`
- `SESSION_DAYS=14`

A API executa a migração SQL em `backend/schema/001_schema.sql` ao iniciar.

## Frontend
No `frontend/.env`:
`VITE_API_URL=https://SEU-ENDPOINT/api`

Execute:
`npm install`
`npm run download:face-models`
`npm run build`

Publique a pasta `frontend/dist` no GitHub Pages, Cloudflare Pages, Vercel ou equivalente.

## Segurança antes de abrir ao público
- Use HTTPS.
- Troque a chave biométrica.
- Restrinja `FRONTEND_URL` ao domínio real.
- Configure backups do PostgreSQL.
- Revise consentimento e política de privacidade da biometria.
- Não coloque secrets no frontend.
- Teste isolamento entre academias com dois tenants.
