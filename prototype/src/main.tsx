import '@trimble-oss/moduswebcomponents/modus-wc-styles.css'
import '@trimble-oss/moduswebcomponents/modus-icons.css'
import { createRoot } from 'react-dom/client'
import { ModusWcThemeProvider } from '@trimble-oss/moduswebcomponents-react'
import './index.css'
import App from './App.tsx'
import { bootstrapLightTheme, LIGHT_THEME } from './theme'

bootstrapLightTheme()

createRoot(document.getElementById('root')!).render(
  <ModusWcThemeProvider initialTheme={LIGHT_THEME}>
    <App />
  </ModusWcThemeProvider>,
)
