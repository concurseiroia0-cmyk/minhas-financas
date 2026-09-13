import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { useSettings } from './store/useSettings.js'
import { iniciarUpdater } from './core/updater.js'
import { uiDetectouUpdate } from './components/UpdateBanner.jsx'
import './db/repo.js'

// Atualização automática: roda no boot, antes de qualquer tela
iniciarUpdater({ aoDetectar: uiDetectouUpdate })

useSettings.getState().load()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
