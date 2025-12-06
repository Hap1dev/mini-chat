import React, {useState, useEffect, useRef} from 'react';
import { LANG } from './i18n';

export default function App(){
  // const GATEWAY_URL=import.meta.env.VITE_GATEWAY_URL;
  const [tenant, setTenant] = useState('tenant-1');
  const [text, setText] = useState('');
  const [provider, setProvider] = useState('echo');
  const [msgs, setMsgs] = useState([]);
  const [lang, setLang] = useState('en');
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef(null);
  const [tenantList, setTenantList] = useState(['tenant-1']);
  const [newTenant, setNewTenant] = useState('');
  const [darkMode, setDarkMode] = useState(false);


  useEffect(()=> {
    fetch(`/history`, { headers: {'X-Tenant-Id': tenant} })
      .then(r=>r.json()).then(d => setMsgs(d.history || []))
      .catch(()=>{});
  }, [tenant]);

  function send() {
      if (!text.trim()) return;
      
      const msgId = Date.now().toString();
      const userMsg = { id: msgId, role:'user', text };
      setMsgs(m => [...m, userMsg]);
      setText('');
      
      const botId = msgId + '-bot';
      const botMsg = { id: botId, role: 'assistant', text: '' };
      setMsgs(m => [...m, botMsg]);
      
      fetch(`/send`, {
          method: 'POST',
          headers: {'Content-Type':'application/json', 'X-Tenant-Id': tenant},
          body: JSON.stringify({ text, provider })
      }).then(r => r.json()).then(({ streamUrl, msgId: sentId }) => {
          setStreaming(true);
          const es = new EventSource(`${streamUrl}?provider=${provider}`);
          
          // Track accumulated response
          let accumulatedResponse = '';
          
          es.onmessage = (e) => {
              const chunk = e.data;
              if (!chunk || chunk === 'done') return;
              
              // Append new chunk to accumulated response
              accumulatedResponse += (accumulatedResponse && !accumulatedResponse.endsWith(' ') ? ' ' : '') + chunk;
              
              // Update the bot message with the full accumulated text
              setMsgs(prev => prev.map(m => 
                  m.id === botId 
                      ? { ...m, text: accumulatedResponse } 
                      : m
              ));
          };
          
          es.addEventListener('done', () => {
              setStreaming(false);
              es.close();
          });
          
          es.onerror = () => {
              setStreaming(false);
              es.close();
          };
      }).catch(error => {
          console.error('Error sending message:', error);
          setStreaming(false);
      });
  }

  return (
  <div className={`container-fluid vh-100 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
    {/* Header with controls */}
    <div className="row py-3 border-bottom">
      <div className="col-12">
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          {/* Title */}
          <h1 className="h3 mb-2 mb-md-0">mini-chat</h1>
          
          {/* Controls group */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Dark/Light mode toggle */}
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="darkModeToggle"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="darkModeToggle">
                {darkMode ? '🌙 Dark' : '☀️ Light'}
              </label>
            </div>
            
            {/* Language selector */}
            <select
              className={`form-select form-select-sm ${darkMode ? 'bg-dark text-light border-secondary' : ''}`}
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Tenant selector row */}
      <div className="col-12 mt-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <label className="form-label mb-0">{LANG[lang].tenantLabel}:</label>
          
          {/* Dropdown of existing tenants */}
          <select
            className={`form-select form-select-sm ${darkMode ? 'bg-dark text-light border-secondary' : ''}`}
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            style={{ width: 'auto' }}
          >
            {tenantList.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          
          {/* Add new tenant */}
          <div className="input-group input-group-sm" style={{ width: 'auto' }}>
            <input
              className={`form-control ${darkMode ? 'bg-dark text-light border-secondary dark-mode-input' : ''}`}
              placeholder="New tenant…"
              value={newTenant}
              onChange={(e) => setNewTenant(e.target.value)}
              style={{ width: '150px' }}
            />
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                if (!newTenant.trim()) return;
                if (!tenantList.includes(newTenant.trim())) {
                  setTenantList(prev => [...prev, newTenant.trim()]);
                }
                setTenant(newTenant.trim());
                setNewTenant('');
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
    
    {/* Chat container */}
    <div className="row flex-grow-1" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="col-12 d-flex flex-column h-100">
        {/* Chat window - full screen with scroll */}
        <div 
          className={`flex-grow-1 overflow-auto border rounded p-3 mb-3 ${darkMode ? 'bg-dark border-secondary' : 'bg-white border-light'}`}
          aria-live="polite"
          style={{ minHeight: 0 }} /* Important for flex child scrolling */
        >
          {msgs.map(m => (
            <div 
              key={m.id} 
              className={`d-flex ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-2`}
            >
              <div 
                className={`p-2 rounded ${m.role === 'user' 
                  ? (darkMode ? 'bg-primary text-white' : 'bg-primary text-white') 
                  : (darkMode ? 'bg-secondary text-light' : 'bg-light text-dark')}`}
                style={{ maxWidth: '80%' }}
              >
                <small className="d-block opacity-75">{m.role}</small>
                <div className="mt-1">{m.text}</div>
              </div>
            </div>
          ))}
          {streaming && (
            <div className="text-muted">
              <em>thinking...</em>
            </div>
          )}
        </div>
        
        {/* Input area with provider selector */}
        <div className="d-flex gap-2 mb-3">
          {/* Provider selector */}
          <select 
            className={`form-select ${darkMode ? 'bg-dark text-light border-secondary' : ''}`}
            value={provider} 
            onChange={e => setProvider(e.target.value)}
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="echo">Echo</option>
            <option value="rule">Rule</option>
            <option value="gpt">GPT</option>
          </select>
          
          {/* Message input and send button */}
          <div className="input-group flex-grow-1">
            <input
              className={`form-control ${darkMode ? 'bg-dark text-light border-secondary dark-mode-input' : ''}`}
              aria-label="message"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={LANG[lang].placeholder}
              onKeyDown={e => { if(e.key === 'Enter') send(); }}
            />
            <button 
              className="btn btn-primary"
              onClick={send}
            >
              {LANG[lang].send}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
