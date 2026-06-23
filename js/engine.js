/**
 * KUROKAGE - Game Engine
 * Gerencia o estado global do jogador e calcula as fórmulas matemáticas do jogo.
 */

window.PlayerState = {
  name: "Renka",
  level: 30,
  classe: "TAI", // TAI, NIN, GEN, BUK
  
  // Atributos Base (distribuídos pelo jogador)
  baseStats: {
    tai: 40,
    nin: 10,
    gen: 5,
    buk: 15,
    stamina_pts: 20
  },

  // Bônus Temporários (Portões de Chakra, Buffs)
  bonusStats: {
    tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, hp_cost: 0, b_tai: 0, b_nin: 0
  },

  // Equipamentos (Permanentes enquanto equipados)
  equipmentStats: {
    tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, def: 0
  },

  activeJutsus: [
    { lvl: 5, name: "Passo de Névoa", desc: "Desloca o usuário através de uma cortina de névoa, evitando o próximo ataque." },
    { lvl: 3, name: "Corte Silencioso", desc: "Golpe rápido com chance de ignorar parte da defesa do oponente." }
  ]
};

window.VillageState = {
  level: 0,
  xp: 0
};

// ==========================================
// SISTEMA DE CARREGAMENTO (NUVEM)
// ==========================================
async function loadGameState() {
  if (!window.supabaseClient) {
    console.error("Supabase não carregado! O jogo requer conexão com o banco de dados.");
    return;
  }

  // 1. Tenta carregar a sessão autenticada
  const { data: authData } = await window.supabaseClient.auth.getSession();
  const user = authData?.session?.user;

  if (user) {
    try {
      // Busca o jogador do banco conectado a esse usuário
      const { data: dbPlayer, error } = await window.supabaseClient
        .from('players')
        .select('*, villages(*)')
        .eq('user_id', user.id)
        .single();

      if (dbPlayer) {
        window.PlayerState = {
          id: dbPlayer.id,
          user_id: dbPlayer.user_id,
          name: dbPlayer.name,
          level: dbPlayer.level,
          classe: dbPlayer.class,
          baseStats: { 
            tai: dbPlayer.tai, nin: dbPlayer.nin, gen: dbPlayer.gen, buk: dbPlayer.buk, stamina_pts: dbPlayer.stamina_pts 
          },
          bonusStats: { tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, hp_cost: 0, b_tai: 0, b_nin: 0 },
          equipmentStats: { tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, def: 0 },
          activeJutsus: []
        };
        window.VillageState = {
          id: dbPlayer.villages?.id || 1,
          level: dbPlayer.villages?.level || 0,
          xp: dbPlayer.villages?.xp || 0
        };
        if(window.Engine) window.Engine.updateUI();
        console.log("🔥 Dados carregados do Banco Supabase Autenticado!");
      }
    } catch(e) {
      console.error("Erro ao buscar dados do jogador no banco:", e);
    }
  } else {
    // Se não estiver logado, redireciona pro login se não estiver na tela de login
    if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('criar.html')) {
       console.log("Usuário não logado. Redirecionando para login...");
       window.location.href = 'login.html';
    }
  }
}

// Dispara o carregamento ao iniciar a página
document.addEventListener('DOMContentLoaded', loadGameState);

window.Engine = {
  // === PERSISTÊNCIA ===
  async saveState() {
    if (window.supabaseClient && window.PlayerState.id) {
      // Atualiza o banco Supabase diretamente
      await window.supabaseClient.from('players').update({
        level: window.PlayerState.level,
        stamina_pts: window.PlayerState.baseStats.stamina_pts,
        tai: window.PlayerState.baseStats.tai,
        nin: window.PlayerState.baseStats.nin,
        gen: window.PlayerState.baseStats.gen,
        buk: window.PlayerState.baseStats.buk
      }).eq('id', window.PlayerState.id);
      
      if (window.VillageState.id) {
        await window.supabaseClient.from('villages').update({
          level: window.VillageState.level,
          xp: window.VillageState.xp
        }).eq('id', window.VillageState.id);
      }
    }
  },

  // === FÓRMULAS ===
  
  // Calcula Stamina: Stamina * 4 + (Atributo principal da classe) * 7 + (Agilidade/Vel?) * 7
  // Simulando a fórmula: ⚡ * 4 + (👤) * 7 + (👤 green) * 7
  calculateStamina() {
    let base = PlayerState.baseStats.stamina_pts * 4;
    
    let mainAttr = 0;
    if (PlayerState.classe === 'TAI') mainAttr = PlayerState.baseStats.tai;
    if (PlayerState.classe === 'NIN') mainAttr = PlayerState.baseStats.nin;
    if (PlayerState.classe === 'GEN') mainAttr = PlayerState.baseStats.gen;
    if (PlayerState.classe === 'BUK') mainAttr = PlayerState.baseStats.buk;
    
    return base + (mainAttr * 7); // Simplificação
  },

  calculateMaxHP() {
    // Fórmula da Vida: ⚡ * 8
    let stm = this.calculateStamina();
    return stm * 8;
  },

  calculateMaxChakra() {
    // Fórmula do Chakra: ⚡ * 4 + (👤) * 7 + (👤 dark) * 20
    let stm = this.calculateStamina();
    let gen = PlayerState.baseStats.gen;
    return (stm * 4) + (gen * 20); // Simplificação
  },

  calculateCurrentHP() {
    let max = this.calculateMaxHP();
    return max + PlayerState.bonusStats.hp_cost; // hp_cost dos portões é negativo
  },

  calculateAttackTai() {
    let totalTai = PlayerState.baseStats.tai + PlayerState.bonusStats.tai + PlayerState.equipmentStats.tai;
    let baseAtk = Math.floor(totalTai / 2);
    let multiplier = 1 + (PlayerState.bonusStats.b_tai / 100);
    return Math.floor(baseAtk * multiplier);
  },

  calculateSpeed() {
    return Math.floor(PlayerState.level * 1.5) + PlayerState.bonusStats.vel + PlayerState.equipmentStats.vel;
  },

  // === AÇÕES ===
  equipItem(stats) {
    PlayerState.equipmentStats = {
      tai: stats.tai || 0,
      nin: stats.nin || 0,
      gen: stats.gen || 0,
      buk: stats.buk || 0,
      vel: stats.vel || 0,
      def: stats.def || 0
    };
    this.saveState();
    this.updateUI();
  },

  equipJutsu(jutsu) {
    // Evita duplicados
    const exists = PlayerState.activeJutsus.find(j => j.name === jutsu.name);
    if (!exists) {
      if (PlayerState.activeJutsus.length >= 4) {
        PlayerState.activeJutsus.shift(); // Remove o mais antigo
      }
      PlayerState.activeJutsus.push(jutsu);
      this.saveState();
      this.updateUI();
    }
  },

  // === VILA ===
  getVillageMaxXP() {
    return (window.VillageState.level + 1) * 1000;
  },

  addVillageXP(amount) {
    window.VillageState.xp += amount;
    let max = this.getVillageMaxXP();
    
    // Level up logic
    while (window.VillageState.xp >= max) {
      window.VillageState.level += 1;
      window.VillageState.xp -= max;
      max = this.getVillageMaxXP();
      alert(`🎉 A Vila Subiu para o Nível ${window.VillageState.level}!`);
    }
    
    this.saveState();
    this.updateUI();
  },

  // === UPDATE UI ===
  updateUI() {
    // 1. DADOS BASE DO JOGADOR
    const heroTitle = document.getElementById('ui-hero-title');
    const heroName = document.getElementById('ui-hero-name');
    const heroLevel = document.getElementById('ui-hero-level');
    const heroXp = document.getElementById('ui-hero-xp');
    
    // Mapeamento simples de vilas para texto
    const vilasMap = { 1: "da Folha", 2: "da Areia", 3: "da Névoa", 4: "da Pedra", 5: "da Nuvem", 6: "do Som", 7: "da Chuva" };
    const vilaNome = vilasMap[PlayerState.village_id || window.VillageState?.id] || "Desconhecida";

    if(heroTitle) heroTitle.innerText = `${PlayerState.name}, ${vilaNome}`;
    if(heroName) heroName.innerText = PlayerState.name;
    if(heroLevel) heroLevel.innerText = PlayerState.level;

    const heroRank = document.getElementById('ui-hero-rank');
    if (heroRank) {
      let rankTitle = "Estudante da Academia";
      if (PlayerState.level >= 10) rankTitle = "Genin";
      if (PlayerState.level >= 25) rankTitle = "Chunin";
      if (PlayerState.level >= 50) rankTitle = "Jonin";
      if (PlayerState.level >= 80) rankTitle = "ANBU";
      if (PlayerState.level >= 100) rankTitle = "Kage das Sombras";
      heroRank.innerText = rankTitle;
    }
    
    if(heroXp) {
      let maxXP = PlayerState.level * 1000;
      heroXp.innerText = `${PlayerState.xp || 0} / ${maxXP}`;
      // Atualizar a barra de xp se ela existir
      const xpFill = document.querySelector('.xp-bar .fill');
      if (xpFill) xpFill.style.width = `${((PlayerState.xp || 0) / maxXP) * 100}%`;
    }

    // Procura elementos na tela com data-engine="..."
    const elHP = document.getElementById('val-hp');
    if (elHP) {
      let curHP = this.calculateCurrentHP();
      let maxHP = this.calculateMaxHP();
      elHP.innerHTML = `<span style="${curHP < maxHP ? 'color:var(--seal-bright)' : ''}">${curHP}</span> / ${maxHP}`;
    }

    const elChakra = document.getElementById('val-chakra');
    if (elChakra) {
      elChakra.innerText = `${this.calculateMaxChakra()} / ${this.calculateMaxChakra()}`;
    }

    const elStamina = document.getElementById('val-stamina');
    if (elStamina) {
      elStamina.innerText = this.calculateStamina();
    }

    const elTai = document.getElementById('val-tai');
    if (elTai) {
      let base = PlayerState.baseStats.tai;
      let bonus = PlayerState.bonusStats.tai;
      elTai.innerHTML = `${base} ${bonus > 0 ? `<span style="color:#4ade80">+${bonus}</span>` : ''}`;
    }

    const elAtk = document.getElementById('val-atk');
    if (elAtk) {
      elAtk.innerText = this.calculateAttackTai();
    }

    const elVel = document.getElementById('val-vel');
    if (elVel) {
      let bonus = PlayerState.bonusStats.vel + PlayerState.equipmentStats.vel;
      let total = this.calculateSpeed();
      elVel.innerHTML = `${total} ${bonus > 0 ? `<span style="color:#4ade80">(+${bonus})</span>` : ''}`;
    }

    const jutsusContainer = document.getElementById('active-jutsus');
    const jutsusCount = document.getElementById('active-jutsus-count');
    if (jutsusContainer) {
      if (jutsusCount) jutsusCount.innerText = `${PlayerState.activeJutsus.length} ATIVAS`;
      jutsusContainer.innerHTML = PlayerState.activeJutsus.map(j => `
        <div class="skill">
          <div class="lvl">NÍVEL ${j.lvl}</div>
          <h4>${j.name}</h4>
          <p>${j.desc}</p>
        </div>
      `).join('');
    }

    // === VILA UI ===
    const elVillageLvl = document.getElementById('val-village-lvl');
    if (elVillageLvl) elVillageLvl.innerText = window.VillageState.level;

    const elVillageMaxLvl = document.getElementById('val-village-maxlvl');
    if (elVillageMaxLvl) elVillageMaxLvl.innerText = window.VillageState.level + 1;

    const elVillageXpText = document.getElementById('val-village-xptext');
    const elVillageXpFill = document.getElementById('val-village-xpfill');
    if (elVillageXpText && elVillageXpFill) {
      let max = this.getVillageMaxXP();
      elVillageXpText.innerText = `${window.VillageState.xp} Exp de / ${max} Exp`;
      let pct = (window.VillageState.xp / max) * 100;
      elVillageXpFill.style.width = `${pct}%`;
    }
  }
};

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
  window.Engine.updateUI();
});
