# Homologação A/B, Raids/VIP e direitos das artes

Status: implementação em desenvolvimento, sem ativação de economia produtiva.

## Ambiente e contas
A branch de teste Supabase precisa de confirmação de custo, solicitada pelo provedor.
Criar duas contas descartáveis e confirmar os e-mails com SMTP da equipe.
Nunca utilizar os dois personagens produtivos no teste.
Depois das migrations 071 e 072, executar o script `npm run qa:staging`
com variáveis de ambiente específicas da branch. O script bloqueia o ID de produção.

## Matriz obrigatória
- Cadastro A/B, confirmação, login e reset de senha.
- Seleção e criação; A não pode ler, alterar ou excluir personagem de B.
- Treino, aprender jutsu, iniciar e concluir missão; custos e recompensas exatos.
- PvE: iniciar sessão, turno, vitória, derrota, finalização, XP, Ryous e histórico.
- Raids de 3 e 5 lutas, uma sessão oficial por combate. Custo de 25 stamina
  somente por luta efetivamente iniciada, persistido na sessão. Idempotência,
  falha, abandono, retomada, concorrência e recursos insuficientes.
- VIP: devolução de um ponto acima do valor-base da classe, 1 crédito debitado,
  trilha de auditoria, recusa de outro usuário e créditos insuficientes.
- Troca integral de personagem NÃO liberada: definir efeitos em progresso,
  equipamentos, técnicas e missões antes de cobrar qualquer moeda.
- Comprovar e registrar titularidade, licença, escopo, documento de autorização
  e caminho local para cada arte. Não promover imagens externas sem direitos.

## Critérios
As flags de Raids e reset VIP começam falsas no servidor.
Não habilitar até testar o SQL em staging, executar a jornada A/B,
validar operações de economia e verificar rollback.
O script cobre parte da matriz; não é prova de uma jornada E2E concluída.
Zero registros de referência são aprovados automaticamente por mera coleta.
