import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GameConfigProvider } from './context/GameConfigContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameConfigProvider>
      <App />
    </GameConfigProvider>
  </StrictMode>,
)
