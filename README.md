# MultiGym — sistema de gestão para academias pequenas e studios

Reescrita completa do projeto atual. O objetivo é entregar um produto funcional, simples e preparado para múltiplas academias.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Fastify + TypeScript
- Banco: PostgreSQL 16
- Autenticação: sessões aleatórias armazenadas apenas por hash + Argon2id
- Multi-tenant: `gym_id` resolvido pela sessão e filtrado no backend

## Módulos
Login/cadastro da academia, Dashboard, Alunos, Matrículas, Planos, Treinos e exercícios, Financeiro, Agenda, Relatórios, Configurações, usuários/equipe e logout.

## Desenvolvimento
1. Copie `.env.example` para `.env`.
2. `docker compose up -d db`
3. `cd backend && npm install && npm run dev`
4. Em outro terminal: `cd frontend && npm install && npm run dev`

O backend executa as migrações SQL automaticamente ao iniciar.
