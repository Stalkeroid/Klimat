import { mount } from 'svelte';
import './styles/theme.css';
import './styles/style.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
