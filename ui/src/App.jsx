import React, {useState, useEffect, useRef} from 'react';
import { LANG } from './i18n';

export default function App(){
  const GATEWAY_URL=import.meta.env.VITE_GATEWAY_URL;
  const [tenant, setTenant] = useState('tenant-1');
  const [text, setText] = useState('');
  const [provider, setProvider] = useState('echo');
  const [msgs, setMsgs] = useState([]);
  const [lang, setLang] = useState('en');
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef(null);
  const [tenantList, setTenantList] = useState(['tenant-1']);
  const [newTenant, setNewTenant] = useState('');


  useEffect(()=> {
    fetch(`${GATEWAY_URL}/history`, { headers: {'X-Tenant-Id': tenant} })
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
      
      fetch(`${GATEWAY_URL}/send`, {
          method: 'POST',
          headers: {'Content-Type':'application/json', 'X-Tenant-Id': tenant},
          body: JSON.stringify({ text, provider })
      }).then(r => r.json()).then(({ streamUrl, msgId: sentId }) => {
          setStreaming(true);
          const es = new EventSource(`${GATEWAY_URL}${streamUrl}?provider=${provider}`);
          
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
    <div style={{maxWidth:700, margin:'20px auto', fontFamily:'sans-serif'}}>
      <div>
      {/* Tenant Selector */}
      <label>{LANG[lang].tenantLabel}: </label>

      {/* Dropdown of existing tenants */}
      <select
        value={tenant}
        onChange={(e) => setTenant(e.target.value)}
        style={{ marginRight: 10 }}
      >
        {tenantList.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Add new tenant */}
      <input
        placeholder="New tenant…"
        value={newTenant}
        onChange={(e) => setNewTenant(e.target.value)}
        style={{ width: 120, marginRight: 5 }}
      />
      <button
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

      {/* Language selector */}
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{ marginLeft: 10 }}
      >
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
    </div>


    <div aria-live="polite" style={{border:'1px solid #ccc', padding:10, minHeight:200, marginTop:10}}>
      {msgs.map(m => <div key={m.id} style={{textAlign: m.role==='user' ? 'right' : 'left', margin:'6px 0'}}>
        <div style={{display:'inline-block', padding:8, borderRadius:8, background: m.role==='user' ? '#d1e7dd' : '#f1f1f1'}}>
          <strong style={{fontSize:12}}>{m.role}</strong><div>{m.text}</div>
        </div>
      </div>)}
      {streaming && <div><em>typing...</em></div>}
    </div>

    <div style={{marginTop:10}}>
        <select value={provider} onChange={e=>setProvider(e.target.value)}>
          <option value="echo">echo</option>
          <option value="rule">rule-based</option>
          <option value="gpt">gpt</option>
        </select>

        <input aria-label="message" value={text} onChange={e=>setText(e.target.value)} placeholder={LANG[lang].placeholder} style={{width:'70%'}} onKeyDown={e=>{ if(e.key==='Enter') send(); }} />
        <button onClick={send} style={{marginLeft:8}}>{LANG[lang].send}</button>
    </div>
  </div>);
}
