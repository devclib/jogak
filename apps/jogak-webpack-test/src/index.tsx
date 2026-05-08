import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { Badge } from './components/ui/badge'

const el = document.getElementById('root')
if (el !== null) {
  createRoot(el).render(<Badge>Default</Badge>)
}
