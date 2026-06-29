import { mount } from 'svelte'
import App from './App.svelte'
import './styles/globals.css'

const target = document.getElementById('app')
if (!target) throw new Error('#app not found')

mount(App, { target })
