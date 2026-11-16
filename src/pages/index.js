// Catálogo de domínios das telas do Kurokage
export * as AuthPages from "./auth";
export * as CentralPages from "./central";
export * as PersonagemPages from "./personagem";
export * as AcademiaPages from "./academia";
export * as CombatePages from "./combate";
export * as VilaPages from "./vila";
export * as PremiumPages from "./premium";

export const PAGE_DOMAINS = Object.freeze({
  auth: ["Login", "RedefinirSenha", "Selecionar", "Criar"],
  central: ["Dashboard"],
  personagem: ["Status", "Equipamentos", "Clas", "Elementos", "Portoes", "Invocacoes"],
  academia: ["Treino", "Tecnicas", "AprimorarJutsus", "Tarefas", "Graduacoes", "Exame"],
  combate: ["Dojo", "Adversarios", "Historico", "Mapa", "Historia", "Evento", "Ranking", "Combate"],
  vila: ["Vila", "Hospital", "Ichiraku", "Ferreiro", "Templo"],
  premium: ["Vip"]
});
