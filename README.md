# MultiGym

Sistema SaaS simples, moderno e seguro para academias pequenas, studios, personal trainers e centros de treinamento.

## Primeira entrega
Esta primeira etapa define a arquitetura, o contrato de segurança e o banco multi-tenant antes da construção das telas e da API.

## Arquitetura planejada
- **Frontend:** React + TypeScript + Vite, componentes reutilizáveis e layout responsivo.
- **Backend:** Node.js + TypeScript + Fastify, API REST modular, validação com Zod.
- **Banco:** PostgreSQL com UUID, integridade referencial, índices por academia e Row-Level Security.
- **Auth:** sessões/JWT de curta duração, senha com Argon2id, recuperação por token de uso único.
- **Deploy:** frontend e API separados; banco PostgreSQL gerenciado.

## Executar o banco local
```bash
docker compose up -d db
```

O schema inicial está em `database/001_initial_schema.sql`. Nunca coloque segredos no repositório; use `.env` local e variáveis protegidas no deploy.

## Ordem de implementação
1. Fundação e banco multi-tenant (entrega atual)
2. Autenticação e criação da academia
3. Layout principal e dashboard
4. Alunos e matrículas
5. Treinos, financeiro e agenda
6. Relatórios, configurações, testes e revisão de segurança
