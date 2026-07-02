import sys

try:
    with open("src/pages/Treino.jsx", "r") as f:
        content = f.read()

    s_map = """  const getRange = (heroMin, heroMax) => {"""
    r_map = """  const attrDesc = {
    ninjutsu: "Aumenta o dano de técnicas Ninjutsu.",
    taijutsu: "Aumenta o dano de técnicas Taijutsu.",
    genjutsu: "Aumenta o dano de técnicas Genjutsu.",
    inteligencia: "Aumenta ataque e defesa de Ninjutsu e Genjutsu.",
    forca: "Aumenta o dano de Taijutsu, Bukijutsu e Vida Máxima (HP).",
    agilidade: "Aumenta sua Esquiva e a chance de Crítico.",
    selo: "Reduz o custo de Chakra de todas as habilidades.",
    resistencia: "Aumenta drasticamente HP, Chakra, Stamina e Defesa."
  };

  const getRange = (heroMin, heroMax) => {"""
    content = content.replace(s_map, r_map)

    s_render = """                {/* Ícone e Nome */}
                <div className="flex-row" style={{ flex: 1, gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px' }}>{icon}</span>
                  <span className="paper uppercase" style={{ fontSize: '13px', fontWeight: 'bold' }}>{label}</span>
                </div>"""
    
    r_render = """                {/* Ícone e Nome */}
                <div className="flex-row" style={{ flex: 1.5, gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px' }}>{icon}</span>
                  <div className="flex-col">
                    <span className="paper uppercase" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>{label}</span>
                    <span className="muted" style={{ fontSize: '10px', lineHeight: '1.4', maxWidth: '200px' }}>{attrDesc[field]}</span>
                  </div>
                </div>"""
    content = content.replace(s_render, r_render)

    with open("src/pages/Treino.jsx", "w") as f:
        f.write(content)
        
    print("Success Treino.jsx")
except Exception as e:
    print("Error:", e)
