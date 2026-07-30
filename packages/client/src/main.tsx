import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import { applyAndroidSystemUi, getAppRuntime } from './native-runtime.js'
import './native-shell.css'

document.documentElement.dataset.runtime = getAppRuntime()
void applyAndroidSystemUi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
