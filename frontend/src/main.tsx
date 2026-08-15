import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() { return <main className="landing"><div className="brand"><strong><span>MG</span> MultiGym</strong><small>Sistema para academias</small></div><section><p className="eyebrow">GESTÃO SIMPLES E PROFISSIONAL</p><h1>O controle da sua academia em um só lugar.</h1><p className="muted">A fundação do MultiGym está pronta. O próximo módulo será o acesso seguro e o ambiente de cada academia.</p><button>Entrar no sistema</button></section></main>; }
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
