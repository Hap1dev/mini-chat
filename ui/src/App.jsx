import React, {useState, useEffect, useRef} from 'react';
import { LANG } from './i18n';

export default function App(){
  const [tenant, setTenant] = useState('tenant-1');
  const [text, setText] = useState('');
  const [provider, setProvider] = useState('echo');
  const [msgs, setMsgs] = useState([]);
  const [lang, setLang] = useState('en');
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef(null);

  useEffect(()=> {
    // load history
    fetch('/history', { headers: {'X-Tenant-Id': tenant} })
      .then(r=>r.json()).then(d => setMsgs(d.history || []))
      .catch(()=>{});
  }, [tenant]);

  function send() {
    if (!text.trim()) return;
    // optimistic UI: add user message
    const msgId = Date.now().toString();
    const userMsg = { id: msgId, role:'user', text };
    setMsgs(m => [...m, userMsg]);
    setText('');
    // call /send
    fetch('/send', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-Tenant-Id': tenant},
      body: JSON.stringify({ text, provider })
    }).then(r=>r.json()).then(({ streamUrl, msgId: sentId })=>{
      setStreaming(true);
      const es = new EventSource(`${streamUrl}?provider=${provider}`);
      let acc = '';
      es.onmessage = (e) => {
        acc += (acc? ' ' : '') + e.data;
        // update assistant message in UI
        setMsgs(prev => {
          const existing = prev.find(m => m.id === sentId+'-bot');
          if (existing) {
            return prev.map(m => m.id===existing.id ? {...m, text: m.text + ' ' + e.data} : m);
          } else {
            return [...prev, { id: sentId+'-bot', role:'assistant', text: e.data }];
          }
        });
      };
      es.addEventListener('done', () => { setStreaming(false); es.close(); });
    });
  }

  return (<div style={{maxWidth:700, margin:'20px auto', fontFamily:'sans-serif'}}>
    <div>
      <label>{LANG[lang].tenantLabel}: <input value={tenant} onChange={e=>setTenant(e.target.value)} /></label>
      <select value={lang} onChange={e=>setLang(e.target.value)} style={{marginLeft:10}}>
        <option value="en">EN</option><option value="es">ES</option>
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
          <option value="echo">Echo</option>
          <option value="rule">Rule-based</option>
        </select>

        <input aria-label="message" value={text} onChange={e=>setText(e.target.value)} placeholder={LANG[lang].placeholder} style={{width:'70%'}} onKeyDown={e=>{ if(e.key==='Enter') send(); }} />
        <button onClick={send} style={{marginLeft:8}}>{LANG[lang].send}</button>
    </div>
  </div>);
}
