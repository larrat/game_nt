import sys

try:
    with open("src/pages/Elementos.jsx", "r") as f:
        content = f.read()

    # 1. Fix ELEMENT_POS
    s_pos = """const ELEMENT_POS = {
  'Katon': { top: '10%', left: '50%' },
  'Futon': { top: '38%', left: '85%' },
  'Raiton': { top: '85%', left: '70%' },
  'Doton': { top: '85%', left: '30%' },
  'Suiton': { top: '38%', left: '15%' }
};"""
    r_pos = """const ELEMENT_POS = {
  'Katon': { top: '20px', left: '160px' },
  'Futon': { top: '116px', left: '293px' },
  'Raiton': { top: '274px', left: '242px' },
  'Doton': { top: '274px', left: '78px' },
  'Suiton': { top: '116px', left: '27px' }
};"""
    content = content.replace(s_pos, r_pos)

    # 2. Add selectedNode state
    s_state = """  const [elementsData, setElementsData] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [loading, setLoading] = useState(false);"""
    r_state = """  const [elementsData, setElementsData] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);"""
    content = content.replace(s_state, r_state)

    # 3. Add displayElement
    s_can = """  const isGenin = player.rank !== 'Estudante da Academia'; // Simplificado
  const canLearn = isLevel5 && isGenin && !player.element;"""
    r_can = """  const isGenin = player.rank !== 'Estudante da Academia'; // Simplificado
  const canLearn = isLevel5 && isGenin && !player.element;
  const displayElement = selectedNode || hoveredElement;"""
    content = content.replace(s_can, r_can)

    # 4. Add onClick to node
    s_node = """                  className={nodeClass}
                  onMouseEnter={() => setHoveredElement(el)}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{ color: el.color, top: el.pos.top, left: el.pos.left }}"""
    r_node = """                  className={nodeClass}
                  onMouseEnter={() => setHoveredElement(el)}
                  onMouseLeave={() => setHoveredElement(null)}
                  onClick={() => setSelectedNode(el)}
                  style={{ color: el.color, top: el.pos.top, left: el.pos.left, cursor: 'pointer' }}"""
    content = content.replace(s_node, r_node)

    # 5. Change right panel to use displayElement
    s_right1 = """          {hoveredElement && (
            <div className="card" style={{ background: 'var(--ink-raised)', borderColor: hoveredElement.color, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '120px', opacity: 0.05, pointerEvents: 'none', color: hoveredElement.color }}>{hoveredElement.icon}</div>
              <h3 className="page-title" style={{ color: hoveredElement.color, marginBottom: '16px', fontSize: '20px' }}>{hoveredElement.name}</h3>
              <p className="paper" style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>
                {hoveredElement.desc}
              </p>"""
    r_right1 = """          {displayElement && (
            <div className="card" style={{ background: 'var(--ink-raised)', borderColor: displayElement.color, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '120px', opacity: 0.05, pointerEvents: 'none', color: displayElement.color }}>{displayElement.icon}</div>
              <h3 className="page-title" style={{ color: displayElement.color, marginBottom: '16px', fontSize: '20px' }}>{displayElement.name}</h3>
              <p className="paper" style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>
                {displayElement.desc}
              </p>"""
    content = content.replace(s_right1, r_right1)

    s_right2 = """                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: '12px', background: hoveredElement.color, opacity: canLearn ? 1 : 0.5, cursor: canLearn ? 'pointer' : 'not-allowed' }}
                    onClick={() => handleLearnElement(hoveredElement.id)}
                    disabled={!canLearn || loading}
                  >"""
    r_right2 = """                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: '12px', background: displayElement.color, opacity: canLearn ? 1 : 0.5, cursor: canLearn ? 'pointer' : 'not-allowed' }}
                    onClick={() => handleLearnElement(displayElement.id)}
                    disabled={!canLearn || loading}
                  >"""
    content = content.replace(s_right2, r_right2)

    with open("src/pages/Elementos.jsx", "w") as f:
        f.write(content)
        
    print("Success Elementos.jsx fixes")
except Exception as e:
    print("Error:", e)
