import { STARTING_ATTRIBUTES } from './startingClassProfiles.js';

// This is a read-only presentation layer. Never award points, compute rewards
// or infer missing attributes from a class template.
export function getDashboardAttributes(player) {
  return STARTING_ATTRIBUTES.map(({ key, label }) => {
    const raw = player?.[key];
    const number = raw === null || raw === undefined || raw === '' ? null : Number(raw);
    return {
      key, label,
      value: Number.isFinite(number) && number >= 0 ? number : null
    };
  });
}

export function getDashboardNextAction(player) {
  if (!player) {
    return { title: 'Selecione seu personagem', description: 'Escolha um ninja para continuar.',
      path: '/selecionar', action: 'Selecionar ninja' };
  }
  if (Array.isArray(player.active_missions) && player.active_missions.length > 0) {
    return { title: 'Missão em andamento', description: 'Acompanhe o progresso da sua missão atual.',
      path: '/tarefas', action: 'Ver missão' };
  }
  const points = Number(player.pontos_atributos);
  if (Number.isFinite(points) && points > 0) {
    return { title: 'Você tem pontos disponíveis', description: 'Confira como fortalecer seu personagem.',
      path: '/treino', action: 'Ver atributos' };
  }
  const trainings = player.daily_trainings == null ? null : Number(player.daily_trainings);
  if (trainings !== null && Number.isFinite(trainings) && trainings < 1) {
    return { title: 'Treine seu ninja', description: 'Seu treino diário ainda não foi registrado.',
      path: '/treino', action: 'Ir para treino' };
  }
  return { title: 'Continue sua jornada', description: 'Explore as missões e escolha seu próximo objetivo.',
    path: '/tarefas', action: 'Ver missões' };
}
