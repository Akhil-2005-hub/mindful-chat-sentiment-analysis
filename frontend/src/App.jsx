import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowUp, LockKeyhole, LogOut, MessageCircle, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const demoRead = () => JSON.parse(localStorage.getItem('mindful-demo-state') || '{"conversations":[],"messages":{}}');
const demoWrite = (state) => localStorage.setItem('mindful-demo-state', JSON.stringify(state));
const demoCall = (path, options) => {
  const state = demoRead();
  const body = options.body ? JSON.parse(options.body) : {};
  if (path.startsWith('/auth/')) return { token: 'browser-demo', user: { id: 'demo', email: body.email } };
  if (path === '/conversations' && options.method === 'POST') {
    const row = { id: Date.now(), title: 'New conversation', createdAt: new Date().toISOString() };
    state.conversations.unshift(row); state.messages[row.id] = []; demoWrite(state); return row;
  }
  if (path === '/conversations') return state.conversations;
  const match = path.match(/^\/conversations\/(\d+)(?:\/messages)?$/);
  if (!match) throw new Error('Demo route not found.');
  const id = Number(match[1]);
  const index = state.conversations.findIndex((c) => c.id === id);
  if (path.endsWith('/messages') && options.method === 'POST') {
    if (index < 0) throw new Error('Conversation not found.');
    const text = String(body.content || '').trim();
    if (!text || text.length > 4000) throw new Error('Message must contain 1–4000 characters.');
    const positive = ['good','great','love','happy','wonderful','excited','thankful','excellent'];
    const negative = ['bad','sad','hate','angry','awful','difficult','worried','frustrated','overwhelmed'];
    const words = text.toLowerCase().match(/[a-z']+/g) || [];
    const raw = (words.filter((w) => positive.includes(w)).length - words.filter((w) => negative.includes(w)).length) / Math.max(words.length, 1);
    const score = Math.max(-1, Math.min(1, raw * 4));
    const label = score > .12 ? 'positive' : score < -.12 ? 'negative' : 'neutral';
    const reply = label === 'positive' ? 'That sounds positive. What part of it matters most to you?' : label === 'negative' ? 'That sounds difficult. Would you like to share a little more about what happened?' : 'I’m here to help. What would you like to explore next?';
    if (state.conversations[index].title === 'New conversation') state.conversations[index].title = text.slice(0, 60) + (text.length > 60 ? '…' : '');
    const pair = [{ id: Date.now(), role: 'user', content: text, sentiment: { label, score: Number(score.toFixed(3)) }, createdAt: new Date().toISOString() }, { id: Date.now()+1, role: 'assistant', content: reply, sentiment: null, createdAt: new Date().toISOString() }];
    state.messages[id].push(...pair); demoWrite(state); return { messages: pair };
  }
  if (path.endsWith('/messages')) return state.messages[id] || [];
  if (options.method === 'DELETE') { state.conversations = state.conversations.filter((c) => c.id !== id); delete state.messages[id]; demoWrite(state); return null; }
  throw new Error('Demo route not found.');
};
const call = async (path, {token, ...options}={}) => {
  if (DEMO_MODE) return demoCall(path, options);
  const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers || {}) } });
  if (res.status === 204) return null;
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
};
function App(){
 const [token,setToken]=useState(localStorage.getItem('mindful-token')||'');
 const [user,setUser]=useState(JSON.parse(localStorage.getItem('mindful-user')||'null'));
 const [mode,setMode]=useState('login'), [email,setEmail]=useState(''), [password,setPassword]=useState('');
 const [convos,setConvos]=useState([]), [active,setActive]=useState(null), [messages,setMessages]=useState([]), [draft,setDraft]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('');
 const endRef=useRef(null);
 useEffect(()=>{ if(token) loadConvos(); },[token]);
 useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);
 async function loadConvos(){try{const data=await call('/conversations',{token});setConvos(data);if(data.length){setActive(a=>a||data[0].id);}}catch(e){logout();}}
 useEffect(()=>{if(!token||!active)return;call(`/conversations/${active}/messages`,{token}).then(setMessages).catch(e=>setError(e.message));},[token,active]);
 async function auth(e){e.preventDefault();setError('');try{const data=await call(`/auth/${mode}`,{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem('mindful-token',data.token);localStorage.setItem('mindful-user',JSON.stringify(data.user));setToken(data.token);setUser(data.user);setPassword('');}catch(e){setError(e.message);}}
 function logout(){localStorage.removeItem('mindful-token');localStorage.removeItem('mindful-user');setToken('');setUser(null);setConvos([]);setMessages([]);setActive(null);}
 async function newChat(){setError('');try{const row=await call('/conversations',{token,method:'POST'});setConvos([row,...convos]);setActive(row.id);setMessages([]);}catch(e){setError(e.message);}}
 async function send(e){e?.preventDefault();if(!draft.trim()||busy)return;let id=active;if(!id){const row=await call('/conversations',{token,method:'POST'});setConvos([row,...convos]);setActive(row.id);id=row.id;}const text=draft.trim();setDraft('');setBusy(true);setMessages(m=>[...m,{role:'user',content:text,pending:true}]);try{const result=await call(`/conversations/${id}/messages`,{token,method:'POST',body:JSON.stringify({content:text})});setMessages(m=>[...m.filter(x=>!x.pending),...result.messages]);loadConvos();}catch(e){setError(e.message);setMessages(m=>m.filter(x=>!x.pending));setDraft(text);}finally{setBusy(false);}}
 async function remove(id,e){e.stopPropagation();try{await call(`/conversations/${id}`,{token,method:'DELETE'});const rest=convos.filter(c=>c.id!==id);setConvos(rest);if(active===id){setActive(rest[0]?.id||null);setMessages([]);}}catch(e){setError(e.message);}}
 if(!token)return <main className="auth-page"><div className="auth-card"><div className="brand"><div className="brand-mark"><MessageCircle size={20}/></div><span>mindful<span className="dot">.</span></span></div><div className="eyebrow">YOUR PRIVATE SPACE</div><h1>{mode==='login'?'A calmer kind of chat.':'Start a thoughtful conversation.'}</h1><p className="muted">A simple chat companion with lightweight sentiment insights. Your conversations stay tied to your account.</p>{DEMO_MODE&&<div className="demo-warning"><b>Public demo:</b> sample sign-in and chat are simulated in this browser only. Don’t enter private information.</div>}<form onSubmit={auth} className="auth-form"><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label><label>Password<input required minLength="10" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters" autoComplete={mode==='login'?'current-password':'new-password'}/></label>{error&&<div className="error">{error}</div>}<button className="primary full">{mode==='login'?'Sign in':'Create account'}</button></form><button className="switch" onClick={()=>{setError('');setMode(mode==='login'?'register':'login')}}>{mode==='login'?"New here? Create an account":"Already have an account? Sign in"}</button><div className="auth-foot"><LockKeyhole size={14}/>{DEMO_MODE ? 'Browser-only demo; no account is created' : 'Protected with password hashing and signed sessions'}</div></div></main>;
 return <main className="shell"><aside className="sidebar"><div className="brand"><div className="brand-mark"><MessageCircle size={20}/></div><span>mindful<span className="dot">.</span></span></div><button className="new-chat" onClick={newChat}><Plus size={17}/> New conversation</button><div className="side-label">RECENT</div><div className="conversation-list">{convos.map(c=><div key={c.id} onClick={()=>setActive(c.id)} className={`conversation ${active===c.id?'selected':''}`}><MessageCircle size={15}/><span>{c.title}</span><button onClick={e=>remove(c.id,e)} aria-label="Delete conversation"><Trash2 size={14}/></button></div>)}</div><div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={16}/><span><b>{DEMO_MODE ? 'Browser-only demo' : 'Your space stays yours'}</b><small>{DEMO_MODE ? 'Demo chat data stays in this browser.' : 'Only your account can access these chats.'}</small></span></div><div className="account"><div className="avatar">{user?.email?.[0]?.toUpperCase()||'U'}</div><div className="account-name"><b>{user?.email}</b><small>Personal workspace</small></div><button className="icon-btn" onClick={logout} aria-label="Sign out"><LogOut size={17}/></button></div></div></aside>
 <section className="main"><header className="topbar"><div><span className="online-dot"/> {DEMO_MODE ? 'PUBLIC DEMO · LOCAL BROWSER STORAGE' : 'PRIVATE SESSION'}</div><div className="top-right"><span><LockKeyhole size={14}/> {DEMO_MODE ? 'Browser-only demo' : 'Private session'}</span><button className="mobile-logout" onClick={logout}><LogOut size={17}/></button></div></header><div className="chat-area"><div className="welcome"><div className="welcome-icon"><Sparkles size={22}/></div><div className="eyebrow">A LITTLE SPACE TO THINK</div><h1>What’s on your mind?</h1><p>Share what you’re thinking. I’ll listen and reflect the tone of your message.</p><div className="suggestions"><button onClick={()=>setDraft('I had a really good day today because ')}>✦ &nbsp;Celebrate a small win</button><button onClick={()=>setDraft('I feel a bit overwhelmed by ')}>✧ &nbsp;Talk through a challenge</button><button onClick={()=>setDraft('Can you help me think about ')}>↗ &nbsp;Work through an idea</button></div></div>{messages.map((m,i)=><div key={m.id||i} className={`message-row ${m.role}`}><div className={`bubble ${m.role}`}>{m.content}{m.pending&&<span className="typing"> ···</span>}{m.sentiment&&<div className={`sentiment ${m.sentiment.label}`}><Activity size={12}/>{m.sentiment.label} tone <span>·</span>{m.sentiment.score>0?'+':''}{m.sentiment.score}</div>}</div></div>)}<div ref={endRef}/></div><div className="composer-wrap"><div className="composer-hint"><Sparkles size={13}/> Thoughtful responses, gentle sentiment insights</div><form className="composer" onSubmit={send}><textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e)}}} rows="1" maxLength="4000" placeholder="Write what’s on your mind…"/><button className="send-btn" disabled={!draft.trim()||busy} aria-label="Send message"><ArrowUp size={19}/></button></form><div className="disclaimer">Sentiment is a lightweight text estimate, not a diagnosis or a substitute for professional support.</div>{error&&<div className="error inline-error">{error}</div>}</div></section></main>
}
export default App;


