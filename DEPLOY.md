# Publicação

## Backend
O projeto inclui `render.yaml`. No Render, crie o serviço a partir do repositório e confira:
- `DATABASE_URL` apontando para o PostgreSQL criado
- `FRONTEND_URL` com a origem pública do frontend
- health check `/health`

## Frontend
Defina `VITE_API_URL` com a URL pública do backend antes do build. Para GitHub Pages, o workflow em `.github/workflows/frontend.yml` publica `frontend/dist`.

## Ordem
1. Subir PostgreSQL.
2. Subir API.
3. Confirmar `/health` e `/health/db`.
4. Publicar frontend apontando `VITE_API_URL` para a API.
5. Criar a primeira academia pela tela de cadastro.
6. Criar os planos em Configurações.
7. Cadastrar alunos e testar matrícula, pagamento, treino, exercício, agenda e relatório.

Nunca coloque `DATABASE_URL` no frontend.
