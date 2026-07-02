import sys

try:
    with open("src/pages/Graduacoes.jsx", "r") as f:
        content = f.read()

    # Import useNavigate
    if "import { useNavigate }" not in content:
        content = content.replace("import PageHeader from '../components/PageHeader';", "import PageHeader from '../components/PageHeader';\nimport { useNavigate } from 'react-router-dom';")

    # Hook init
    if "const navigate = useNavigate();" not in content:
        content = content.replace("const [newRank, setNewRank] = useState('');", "const [newRank, setNewRank] = useState('');\n  const navigate = useNavigate();")

    # Add requirement
    s_req = """          // Novos requisitos"""
    r_req = """          // Novos requisitos
          if (r.name_id === 'Chunin') {
            reqs.push({
              label: 'Aprovação na Floresta da Morte (Exame Chunin)',
              check: (p) => p.passou_exame_chunin === true,
              progress: (p) => p.passou_exame_chunin ? '1/1' : '0/1'
            });
          }"""
    content = content.replace(s_req, r_req)

    # Change button logic
    s_btn = """            <button 
              className="btn btn-primary" 
              style={{ width: '100%', opacity: canGraduate ? 1 : 0.5, cursor: canGraduate ? 'pointer' : 'not-allowed' }}
              disabled={!canGraduate} 
              onClick={() => graduarPara(nextRank.id)}
            >
              <span>{canGraduate ? 'Realizar Exame Ninja' : 'Requisitos Incompletos'}</span>
              <div className="stamp"></div>
            </button>"""
            
    r_btn = """            {nextRank.id === 'Chunin' && !player.passou_exame_chunin ? (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => navigate('/exame')}
              >
                <span>Ir para a Floresta da Morte</span>
                <div className="stamp"></div>
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', opacity: canGraduate ? 1 : 0.5, cursor: canGraduate ? 'pointer' : 'not-allowed' }}
                disabled={!canGraduate} 
                onClick={() => graduarPara(nextRank.id)}
              >
                <span>{canGraduate ? 'Graduar Ninja' : 'Requisitos Incompletos'}</span>
                <div className="stamp"></div>
              </button>
            )}"""
    content = content.replace(s_btn, r_btn)

    with open("src/pages/Graduacoes.jsx", "w") as f:
        f.write(content)
        
    print("Success Graduacoes.jsx")
except Exception as e:
    print("Error:", e)
