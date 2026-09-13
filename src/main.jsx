import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { useSettings } from './store/useSettings.js'
import './db/repo.js'

// Service worker é registrado pelo <UpdateBanner /> (atualização automática)

useSettings.getState().load()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
