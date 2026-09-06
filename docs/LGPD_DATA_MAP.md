# Mapa de dados e controles LGPD — MultiGym

## Dados tratados

- Cadastro: nome, CPF, nascimento, contato, endereço e contato de emergência.
- Operação: matrículas, pagamentos, vendas, caixa, agenda e check-in.
- Saúde e treino: limitações, objetivos, avaliações, treinos, refeições e hidratação.
- Biometria: descritor facial criptografado, consentimento e revogação. Nenhuma imagem facial é persistida pelo check-in.
- IA: mensagens, diagnósticos nutricionais e metadados técnicos necessários ao atendimento.

## Controles existentes

- Isolamento por `gym_id` e por aluno nas rotas do portal.
- Senhas com Argon2 e tokens armazenados como hash.
- Revogação do consentimento facial.
- Revogação de sessões antigas após troca de senha.
- Retenção automática dos diagnósticos de visão após `expires_at`.
- Rate limit, Helmet e CORS na API.
- Logs de auditoria para operações administrativas existentes.
- Exportação dos dados pessoais do aluno pelo próprio portal.

## Pendências de governança

- Definir prazo formal de retenção por categoria de dado.
- Migrar imagens de refeições e avisos para armazenamento de objetos.
- Configurar política de exclusão mediante solicitação documentada.
- Registrar controlador, operador, encarregado e canal de atendimento LGPD.
- Validar backup criptografado, restauração e segregação de acesso.
