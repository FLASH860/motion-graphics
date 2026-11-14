import { createRoot } from 'react-dom/client'
import '@fontsource-variable/cormorant/wght.css'
import '@fontsource-variable/cormorant/wght-italic.css'
import '@fontsource-variable/hanken-grotesk'
import './styles/global.css'
import './styles/chrome.css'
import './styles/scene.css'
import './styles/hero.css'
import './styles/passage.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
