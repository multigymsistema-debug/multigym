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

Publique a pasta `frontend/dist` no GitHub Pages, Cloudflare Pages, Vercel ou equivalente. O portal do aluno fica disponível em `/nutrigym` (o build inclui o mesmo app React e a configuração `VITE_API_URL`).

O endereço publicado atualmente pelo repositório é `https://multigymsistema-debug.github.io/multigym/`. Para o portal, use o caminho `/nutrigym/`. Antes de abrir para alunos, configure `VITE_API_URL` com a URL HTTPS real da API e `FRONTEND_URL` com a origem exata do site.

## Segurança antes de abrir ao público
- Use HTTPS.
- Troque a chave biométrica.
- Restrinja `FRONTEND_URL` ao domínio real.
- Configure backups do PostgreSQL.
- Revise consentimento e política de privacidade da biometria.
- Não coloque secrets no frontend.
- Teste isolamento entre academias com dois tenants.
