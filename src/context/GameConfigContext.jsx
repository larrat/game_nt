import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const GameConfigContext = createContext();

export function GameConfigProvider({ children }) {
  const [gameConfig, setGameConfig] = useState({});

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase.from('game_config').select('*');
      if (data) {
        const configMap = {};
        data.forEach(item => {
          try {
            configMap[item.key] = JSON.parse(item.value);
          } catch (e) {
            configMap[item.key] = item.value;
          }
        });
        setGameConfig(configMap);
      }
    }
    loadConfig();
  }, []);

  return (
    <GameConfigContext.Provider value={gameConfig}>
      {children}
    </GameConfigContext.Provider>
  );
}

export function useGameConfig() {
  return useContext(GameConfigContext);
}
