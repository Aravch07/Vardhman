import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Bell, BookOpen, Calculator, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardList, LayoutDashboard, LogOut, Menu, PackageSearch, Search, Truck, X } from 'lucide-react';
import { estimate, quantityValid, transitions } from '../shared/commerce.js';
import { company, demoRequests, products } from './data.js';
import { AuthForm, InviteForm, ProductDetails, RequestDetails, RequestForm } from './forms.jsx';
import { Catalog, Dashboard, Requests, Resources } from './pages.jsx';
import { Delivery, Pricing } from './tools.jsx';
import { api, Button, IconButton, Modal, Status } from './ui.jsx';
import './style.css';

const navigation = [
  ['overview','Overview',LayoutDashboard],['catalog','Product catalog',PackageSearch],['requests','Requests & orders',ClipboardList],
  ['delivery','Delivery estimator',Truck],['pricing','Pricing & margins',Calculator],['resources','Resources & support',BookOpen]
];
const currentPage = () => {
  const value=location.hash.slice(1);
  return navigation.some(([key])=>key===value)?value:'overview';
};
const invitationCode = new URLSearchParams(location.hash.slice(1)).get('invite');
if (invitationCode) history.replaceState(null,'',location.pathname+location.search);

function demoHistory() {
  try {return JSON.parse(sessionStorage.getItem('vardhman-demo-v1')) || demoRequests;}
  catch {return demoRequests;}
}
function displayTitle(key,staff){return staff && key==='requests'?'Dealer requests':navigation.find(([name])=>name===key)?.[1];}
function initials(name) {return name?.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'DE';}

function Sidebar({ page, go, open, close, account }) {
  return <>
    {open && <button className="mobile-scrim" aria-label="Close navigation" onClick={close}/>}
    <aside className={'sidebar '+(open?'sidebar-open':'')}>
      <a href="#overview" className="brand" onClick={e=>{e.preventDefault();go('overview');}} aria-label="Vardhman A&E Threads home">
        <img src="/assets/vardhman.png" alt="Vardhman A&E Threads"/>
        <span>DEALER PORTAL</span>
      </a>
      <nav aria-label="Main navigation">
        <div className="nav-group"><div className="nav-label">WORKSPACE</div>{navigation.slice(0,3).map(([key,,Icon])=>
          <a href={'#'+key} key={key} className={page===key?'active':''} aria-current={page===key?'page':undefined} onClick={e=>{e.preventDefault();go(key);}}><Icon size={19}/>{displayTitle(key,account?.role==='staff')}{page===key&&<i/>}</a>)}</div>
        <div className="nav-group"><div className="nav-label">SELLING TOOLS</div>{navigation.slice(3,5).map(([key,label,Icon])=>
          <a href={'#'+key} key={key} className={page===key?'active':''} aria-current={page===key?'page':undefined} onClick={e=>{e.preventDefault();go(key);}}><Icon size={19}/>{label}{page===key&&<i/>}</a>)}</div>
        <div className="nav-group"><div className="nav-label">SUPPORT</div>{navigation.slice(5).map(([key,label,Icon])=>
          <a href={'#'+key} key={key} className={page===key?'active':''} aria-current={page===key?'page':undefined} onClick={e=>{e.preventDefault();go(key);}}><Icon size={19}/>{label}{page===key&&<i/>}</a>)}</div>
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={18}/></span><div><strong>Need assistance?</strong><a href={company+'/contact-us'} target="_blank" rel="noreferrer">Contact sales support <ArrowUpRight size={13}/></a></div></div>
      <a className="company-link" href={company} target="_blank" rel="noreferrer">Vardhman corporate website <ArrowUpRight size={14}/></a></div>
    </aside>
  </>;
}

function QuickSearch({ rows, openProduct, openRequest, go, close }) {
  const [query,setQuery]=useState('');
  const needle=query.trim().toLowerCase();
  const matchedProducts=needle?products.filter(p=>[p.name,p.fiber,...p.applications].join(' ').toLowerCase().includes(needle)).slice(0,6):[];
  const matchedRequests=needle?rows.filter(r=>[r.id,r.company,r.payload.city,...r.payload.items.map(i=>i.name)].join(' ').toLowerCase().includes(needle)).slice(0,5):[];
  return <><label className="search-field modal-search"><Search size={19}/><input autoFocus placeholder="Search products and requests" aria-label="Search products and requests" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="search-results">{!needle ? navigation.slice(1,5).map(([key,label,Icon])=><button key={key} onClick={()=>{go(key);close();}}><Icon size={18}/><span>{label}</span><ArrowRight size={15}/></button>) : <>
      {matchedProducts.map(p=><button key={p.id} onClick={()=>openProduct(p)}><PackageSearch size={18}/><span>{p.label}<small>{p.category}</small></span><ArrowUpRight size={15}/></button>)}
      {matchedRequests.map(r=><button key={r.id} onClick={()=>openRequest(r.id)}><ClipboardList size={18}/><span>{r.id}<small>{r.payload.items[0].name}</small></span><Status status={r.status}/></button>)}
      {!matchedProducts.length&&!matchedRequests.length&&<p>No matching products or requests.</p>}
    </>}</div></>;
}

function App() {
  const [page,setPage]=useState(currentPage);
  const [account,setAccount]=useState(null);
  const [rows,setRows]=useState(demoHistory);
  const [live,setLive]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loadError,setLoadError]=useState('');
  const [modal,setModal]=useState(invitationCode?{type:'auth',invitation:invitationCode}:null);
  const [drawer,setDrawer]=useState(false);
  const [toast,setToast]=useState('');
  const [pricingPrefill,setPricingPrefill]=useState(null);
  const [priceKey,setPriceKey]=useState(0);
  const activeRows=account?live:rows;
  const staff=account?.role==='staff';

  const go=useCallback((key)=>{
    if(location.hash!=='#'+key) history.pushState(null,'','#'+key);
    setPage(key);setDrawer(false);window.scrollTo({top:0,behavior:'instant'});
  },[]);
  const refresh=useCallback(async()=>{
    setLoading(true);setLoadError('');
    try {const data=await api('requests');setLive(data.requests);}
    catch(error){setLoadError(error.message);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    let active=true;
    api('session').then(data=>{if(active&&data.account)setAccount(a=>a||data.account);}).catch(()=>{});
    function navigate(){setPage(currentPage());setDrawer(false);}
    addEventListener('hashchange',navigate);
    return ()=>{active=false;removeEventListener('hashchange',navigate);};
  },[]);
  useEffect(()=>{if(account)refresh();else {setLive([]);setLoadError('');}},[account,refresh]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),3600);return()=>clearTimeout(id);},[toast]);
  useEffect(()=>{
    const search=e=>{if(!document.querySelector('dialog[open]')&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setModal({type:'search'});}};
    addEventListener('keydown',search);return()=>removeEventListener('keydown',search);
  },[]);
  const close=()=>setModal(null);
  const newRequest=(prefill={})=>setModal(staff?{type:'invite'}:{type:'request',prefill});
  const openRequest=id=>setModal({type:'detail',id});
  const openProduct=product=>setModal({type:'product',product});
  const writeDemo=next=>{setRows(next);try{sessionStorage.setItem('vardhman-demo-v1',JSON.stringify(next));}catch{/* Private browsing can disable storage. */}};
  async function submitRequest(draft) {
    let record;
    if(account) {
      ({request:record}=await api('submit',draft));
      setLive(list=>[record,...list.filter(row=>row.id!==record.id)]);
    } else {
      if(draft.items.some(i=>!i.article.trim()||!i.shade.trim()||!quantityValid(Number(i.quantity)))||!draft.city.trim()) throw new Error('Enter an article, shade and destination city.');
      const items=draft.items.map(i=>({...i,name:products.find(p=>p.id===i.product)?.name,quantity:Number(i.quantity)}));
      const now=new Date().toISOString();
      record={id:'DEMO-'+draft.key.slice(0,7).toUpperCase(),status:'Submitted',created_at:now,history:[{status:'Submitted',at:now}],payload:{...draft,items,estimate:estimate(draft.pin,items,draft.service)}};
      writeDemo([record,...rows]);
    }
    go('requests');openRequest(record.id);setToast(account?'Request submitted':'Demo request saved');
  }
  async function changeStatus(body) {
    if(account) {
      const {request}=await api('status',body);
      setLive(list=>list.map(r=>r.id===body.id?{...r,...request}:r));
    } else {
      const row=rows.find(r=>r.id===body.id);
      if(!transitions[row?.status]?.includes(body.status)) throw new Error('That status change is unavailable.');
      writeDemo(rows.map(r=>r.id===body.id?{...r,status:body.status,history:[...r.history,{status:body.status,at:new Date().toISOString()}]}:r));
    }
    setToast('Request updated');
  }
  async function saveResale(body) {
    if(account) {
      const {resale}=await api('resale',body);
      setLive(list=>list.map(row=>row.id===body.id?{...row,resale}:row));
    } else {
      writeDemo(rows.map(row=>row.id===body.id?{...row,resale:{revenue:Number(body.revenue),expenses:Number(body.expenses)}}:row));
    }
    setToast('Resale figures saved');
  }
  function priceFromQuote(quote,items) {
    const quantity=items.reduce((sum,i)=>sum+i.quantity,0);
    setPricingPrefill(items.length===1?{quantity:String(quantity),unitCost:(quote.subtotal/quantity).toFixed(2),freight:String(quote.freight),handling:'0'}:{quantity:'1',unitCost:String(quote.subtotal),freight:String(quote.freight),handling:'0'});
    setPriceKey(k=>k+1);close();go('pricing');
  }
  async function logout() {
    try {await api('logout',{});setAccount(null);close();go('overview');setToast('Signed out');}
    catch(error){setToast(error.message);}
  }
  const selectedRow=modal?.type==='detail'?activeRows.find(r=>r.id===modal.id):null;
  const updates=activeRows.filter(r=>['Quoted','Dispatched','Delivered'].includes(r.status)).slice(0,5);
  return <div className="shell">
    <a className="skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content').focus();}}>Skip to content</a>
    <Sidebar page={page} go={go} open={drawer} close={()=>setDrawer(false)} account={account}/>
    <div className="workspace">
      <header className="topbar"><div className="crumb"><IconButton icon={Menu} label="Open navigation" className="mobile-menu" onClick={()=>setDrawer(true)}/><span>Workspace</span><ChevronRight size={14}/><strong>{displayTitle(page,staff)}</strong></div>
        <div className="top-actions">
          <button className="global-search" onClick={()=>setModal({type:'search'})} aria-label="Search workspace"><Search size={17}/><span>Search workspace</span><kbd>Ctrl K</kbd></button>
          <IconButton icon={Bell} label="Request updates" className="bell" onClick={()=>setModal({type:'updates'})}/>
          <span className="top-divider"/>
          <button className="account-button" aria-label={account ? 'Your account' : 'Sign in'} onClick={()=>setModal({type:account?'account':'auth'})}><span className="avatar">{initials(account?.name)}</span><span className="account-label"><strong>{account?.name || 'Dealer access'}</strong><small>{account?staff?'Sales staff':account.company:'Sign in'}</small></span><ChevronDown size={14}/></button>
        </div>
      </header>
      <main id="main-content" className="main" tabIndex={-1}>
        {page==='overview' && <Dashboard rows={activeRows} account={account} demo={!account} go={go} onNew={()=>newRequest()} onOpen={openRequest} onProduct={openProduct}/>}
        {page==='catalog' && <Catalog onProduct={openProduct}/>}
        {page==='requests' && <Requests rows={activeRows} staff={staff} onOpen={openRequest} onNew={()=>newRequest()} loading={loading} error={loadError} refresh={refresh}/>}
        {page==='delivery' && <Delivery onNew={staff?null:newRequest}/>}
        {page==='pricing' && <Pricing key={priceKey} prefill={pricingPrefill} onReset={()=>setPricingPrefill(null)}/>}
        {page==='resources' && <Resources/>}
        <footer className="footer"><span>Vardhman A&E Threads · Dealer portal pilot</span>{!account&&<span className="demo-note"><i/> Demo workspace · Sample commercial data</span>}</footer>
      </main>
    </div>
    {modal?.type==='auth' && <Modal key="auth" title="Dealer portal access" subtitle="Sign in with your invited dealer or sales staff account." onClose={close}><AuthForm invitation={modal.invitation} onDemo={close} onAccount={a=>{setAccount(a);close();go(a.role==='staff'?'requests':'overview');setToast('Signed in');}}/></Modal>}
    {modal?.type==='account' && account && <Modal key="account" title="Your account" onClose={close}><div className="account-detail"><span className="avatar">{initials(account.name)}</span><div><h3>{account.name}</h3><p>{account.company} · {staff?'Sales staff':'Dealer'}</p><p>{account.email}</p></div></div><Button icon={LogOut} variant="secondary" onClick={logout}>Sign out</Button></Modal>}
    {modal?.type==='product' && <Modal key="product" title="Product details" onClose={close} wide><ProductDetails product={modal.product} onNew={staff?null:newRequest}/></Modal>}
    {modal?.type==='request' && <Modal key="request" title="New article request" subtitle={account?'Send an article request to your sales team.':'Demo mode. This request stays in your current browser session.'} onClose={close} wide><RequestForm initial={modal.prefill} demo={!account} onSubmit={submitRequest}/></Modal>}
    {selectedRow && <Modal key="detail" title={selectedRow.id} subtitle="Article request and order details" onClose={close} wide><RequestDetails key={selectedRow.id} row={selectedRow} staff={staff} onChange={changeStatus} onPrice={staff?null:priceFromQuote} onResale={staff?null:saveResale} demo={!account}/></Modal>}
    {modal?.type==='invite' && <Modal key="invite" title="Invite a dealer" subtitle="Create an invitation restricted to the dealer’s work email." onClose={close}><InviteForm/></Modal>}
    {modal?.type==='search' && <Modal key="search" title="Search workspace" onClose={close}><QuickSearch rows={activeRows} go={go} close={close} openProduct={openProduct} openRequest={openRequest}/></Modal>}
    {modal?.type==='updates' && <Modal key="updates" title="Request updates" onClose={close}><div className="search-results">{updates.length?updates.map(r=><button key={r.id} onClick={()=>openRequest(r.id)}><ClipboardList size={18}/><span>{r.id}<small>{r.payload.items[0].name}</small></span><Status status={r.status}/></button>):<p>New quotes and shipment updates will appear here.</p>}</div></Modal>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<IconButton icon={X} label="Dismiss notification" onClick={()=>setToast('')}/></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
