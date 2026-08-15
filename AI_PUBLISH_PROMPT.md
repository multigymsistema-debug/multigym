# Prompt para a IA de publicação

Você recebeu o ZIP `MultiGym 2.0`.

NÃO recrie o sistema do zero novamente e NÃO substitua a arquitetura por um protótipo. Este ZIP é o novo código-base. Primeiro leia todos os arquivos, instale dependências, rode o banco/API/frontend localmente e faça uma auditoria técnica. Depois publique a aplicação.

Objetivos de publicação:
1. Subir PostgreSQL e API.
2. Configurar `DATABASE_URL`, `FRONTEND_URL`, `SESSION_DAYS` e uma `BIOMETRIC_ENCRYPTION_KEY` aleatória de 32 bytes em hexadecimal.
3. No frontend, configurar `VITE_API_URL` para a API real.
4. Executar `npm install`, `npm run download:face-models` e `npm run build`.
5. Publicar o `frontend/dist`.
6. Testar login, criação de academia, alunos, planos, matrículas, pagamentos, caixa, produtos, serviços, treinos, agenda, relatórios e check-in.
7. Testar o reconhecimento facial em HTTPS e confirmar o fallback de check-in manual.
8. Testar isolamento multi-tenant com duas academias.
9. Não remover funcionalidades para “simplificar”.
10. Se encontrar erro de build/runtime, corrija no código e repita o teste.

Depois da publicação, entregue:
- URL da API
- URL do frontend
- resultado do build
- resultado dos testes principais
- variáveis que ainda precisam ser configuradas
- qualquer pendência real que impeça produção.

Não declare “publicado” se o login, banco, API ou build estiverem quebrados.
