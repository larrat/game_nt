import sys

try:
    with open("src/components/TopBar.jsx", "r") as f:
        content = f.read()

    s1 = """  useEffect(() => {
    if (player?.ryous > prevRyousRef.current) {
      setRyouGlow(true);
      setTimeout(() => setRyouGlow(false), 2000);
    }
    prevRyousRef.current = player?.ryous;
  }, [player?.ryous]);"""
    r1 = """  useEffect(() => {
    if (player?.ryous > prevRyousRef.current) {
      setRyouGlow(true);
      setTimeout(() => setRyouGlow(false), 2000);
    }
    prevRyousRef.current = player?.ryous;
  }, [player?.ryous]);

  // Regen passivo de HP e Chakra
  useEffect(() => {
    if (!player || player.is_fainted) return;
    
    const interval = setInterval(async () => {
      const maxH = calculateHP(player);
      const maxC = calculateChakra(player);
      const maxS = 100; // Stamina base
      
      let currentH = player.hp !== undefined && player.hp !== null ? player.hp : maxH;
      let currentC = player.chakra !== undefined && player.chakra !== null ? player.chakra : maxC;
      let currentS = player.stamina !== undefined && player.stamina !== null ? player.stamina : maxS;
      
      if (currentH < maxH || currentC < maxC || currentS < maxS) {
        // Regenera 10% a cada 10 segundos
        const newH = Math.min(maxH, currentH + Math.max(1, Math.floor(maxH * 0.1)));
        const newC = Math.min(maxC, currentC + Math.max(1, Math.floor(maxC * 0.1)));
        const newS = Math.min(maxS, currentS + Math.max(1, Math.floor(maxS * 0.1)));
        
        await supabase.from('players').update({ hp: newH, chakra: newC, stamina: newS }).eq('id', player.id);
        if (updatePlayer) updatePlayer();
      }
    }, 10000); // 10 segundos
    
    return () => clearInterval(interval);
  }, [player, updatePlayer]);"""
    
    # Needs to import supabase
    if "import { supabase }" not in content:
        content = content.replace("import { useLocation } from 'react-router-dom';", "import { useLocation } from 'react-router-dom';\nimport { supabase } from '../supabaseClient';")

    content = content.replace(s1, r1)

    with open("src/components/TopBar.jsx", "w") as f:
        f.write(content)
        
    print("Success TopBar.jsx")
except Exception as e:
    print("Error:", e)
