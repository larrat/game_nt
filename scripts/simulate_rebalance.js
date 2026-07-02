// scripts/simulate_rebalance.js

function calcOld(profile) {
  return {
    HP: 100 + (profile.Lvl * 30) + (profile.Res * 10) + (profile.Ene * 5),
    CP: 100 + (profile.Lvl * 20) + (profile.Ene * 5) + (profile.Nin * 5) + (profile.Gen * 5),
    St: 100 + (profile.Lvl * 20) + (profile.Ene * 5) + (profile.Tai * 5) + (profile.Buk * 5),
    DefFis: profile.Res + (profile.Tai / 2),
    DefMag: profile.Res + (profile.Nin / 2),
    Crit: profile.Agi / 5,
    Dodge: profile.Agi / 5
  };
}

function calcNew(profile) {
  return {
    HP: 100 + (profile.Lvl * 30) + (profile.Res * 15),
    CP: 100 + (profile.Lvl * 20) + (profile.Ene * 5) + (profile.Nin * 5) + (profile.Gen * 5),
    St: 100 + (profile.Lvl * 20) + (profile.Ene * 5) + (profile.Tai * 5) + (profile.Buk * 5),
    DefFis: profile.Res + (profile.Tai + profile.Buk) / 4,
    DefMag: profile.Res + (profile.Nin + profile.Gen) / 4,
    Crit: (profile.For + profile.Int) / 10,
    Dodge: profile.Agi / 5
  };
}

const profiles = [
  {
    name: "Lvl 5 Genin (Ofensivo/Taijutsu)",
    Lvl: 5, Res: 5, Ene: 5, For: 15, Int: 5, Tai: 15, Nin: 5, Gen: 5, Buk: 10, Agi: 10
  },
  {
    name: "Lvl 20 Chunin (Tank/Genjutsu)",
    Lvl: 20, Res: 30, Ene: 20, For: 10, Int: 20, Tai: 10, Nin: 10, Gen: 25, Buk: 10, Agi: 15
  },
  {
    name: "Lvl 50 Jounin (Equilibrado Ninja Misto)",
    Lvl: 50, Res: 40, Ene: 40, For: 30, Int: 30, Tai: 30, Nin: 30, Gen: 20, Buk: 20, Agi: 40
  }
];

profiles.forEach(p => {
  const oldStats = calcOld(p);
  const newStats = calcNew(p);
  
  console.log(`\n================================`);
  console.log(`👤 Perfil: ${p.name}`);
  console.log(`Atributos: Res:${p.Res} Ene:${p.Ene} For:${p.For} Int:${p.Int} Tai:${p.Tai} Nin:${p.Nin} Gen:${p.Gen} Buk:${p.Buk} Agi:${p.Agi}`);
  console.log(`--------------------------------`);
  
  const keys = Object.keys(oldStats);
  keys.forEach(k => {
    let diff = newStats[k] - oldStats[k];
    let perc = oldStats[k] > 0 ? (diff / oldStats[k] * 100).toFixed(2) : 0;
    
    // Formatting sign
    const sign = diff > 0 ? '+' : '';
    console.log(`${k.padEnd(7)} | Antes: ${oldStats[k].toString().padEnd(5)} | Depois: ${newStats[k].toString().padEnd(5)} | Delta: ${sign}${diff} (${sign}${perc}%)`);
  });
});
