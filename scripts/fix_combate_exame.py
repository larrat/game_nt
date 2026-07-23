import sys

try:
    with open("src/pages/Combate.jsx", "r") as f:
        content = f.read()

    # Block Consumables
    s_cons = """            {/* Consumíveis */}
            {player.consumables?.filter(c => c.quantity > 0).map((cons, idx) => ("""
    
    r_cons = """            {/* Consumíveis (Bloqueado no Exame) */}
            {location.state?.isExame ? (
              <div className="flex-col" style={{ alignItems: 'center', padding: '16px', border: '1px dashed #ef4444', color: '#ef4444', opacity: 0.7, marginTop: '8px' }}>
                <span style={{ fontSize: '20px', marginBottom: '8px' }}>🚫</span>
                <span style={{ fontSize: '12px', textAlign: 'center' }}>Uso de itens proibido no Exame Chunin!</span>
              </div>
            ) : (
              player.consumables?.filter(c => c.quantity > 0).map((cons, idx) => ("""
              
    content = content.replace(s_cons, r_cons)

    s_cons_end = """                 <div className="mono" style={{ fontSize: "10px", color: "#10b981" }}>+{cons.effect_value} {cons.type.toUpperCase()}</div>
               </button>
            ))}"""
    
    r_cons_end = """                 <div className="mono" style={{ fontSize: "10px", color: "#10b981" }}>+{cons.effect_value} {cons.type.toUpperCase()}</div>
               </button>
              ))
            )}"""
    content = content.replace(s_cons_end, r_cons_end)

    # Return to Exame
    s_ret = """<button className="btn-primary" onClick={battleResult === 'world_boss_end' ? handleWorldBossEnd : () => navigate(battleResult === 'win' ? (location.state?.fromMap ? '/mapa' : '/dojo') : '/hospital')} disabled={loading}>"""
    
    r_ret = """<button className="btn-primary" onClick={battleResult === 'world_boss_end' ? handleWorldBossEnd : () => navigate(battleResult === 'win' ? (location.state?.isExame ? '/exame' : (location.state?.fromMap ? '/mapa' : '/dojo')) : (location.state?.isExame ? '/exame' : '/hospital'), { state: { roundWon: battleResult === 'win' ? location.state?.exameRound : null } })} disabled={loading}>"""
    
    content = content.replace(s_ret, r_ret)

    # Do not heal HP on win for Exame!
    # Wait, the win logic ALREADY saves exactly what HP they finished with. So HP isn't healed on win!
    # BUT wait! If they start the next round, Combate.jsx uses `useState(maxPlayerHP)`.
    # I need to change Combate.jsx to start with the DB hp if they are in Exame!
    # Actually, let's fix `useState(maxPlayerHP)` to `useState(location.state?.isExame ? player.hp : maxPlayerHP)`
    
    s_hp = """  const [playerHP, setPlayerHP] = useState(maxPlayerHP);
  const [playerCP, setPlayerCP] = useState(maxPlayerCP);"""
    
    r_hp = """  const [playerHP, setPlayerHP] = useState(location.state?.isExame && player.hp !== undefined ? player.hp : maxPlayerHP);
  const [playerCP, setPlayerCP] = useState(location.state?.isExame && player.chakra !== undefined ? player.chakra : maxPlayerCP);"""
    
    content = content.replace(s_hp, r_hp)

    with open("src/pages/Combate.jsx", "w") as f:
        f.write(content)
        
    print("Success Combate.jsx Exame fixes")
except Exception as e:
    print("Error:", e)
