import React, { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Calculator, ChevronDown, ClipboardList, Clock3, ExternalLink, Package, Plus, Search, SlidersHorizontal, Truck, Wallet } from 'lucide-react';
import { money, resaleProfit, stages } from '../shared/commerce.js';
import { categories, company, featured, products, resources } from './data.js';
import { Blank, Button, downloadCsv, PageHeader, ProductCard, RequestTable } from './ui.jsx';

const periodOptions = [['3','Last 3 months'], ['6','Last 6 months'], ['12','Last 12 months']];
const finalStatuses = ['Confirmed','Dispatched','Delivered'];

function monthSeries(rows, period, mode) {
  const now = new Date();
  const months = Array.from({ length: period }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - period + i + 1, 1);
    return { label: month.toLocaleString('en', {month:'short'}), value: 0, year: month.getFullYear(), month: month.getMonth() };
  });
  for (const row of rows) {
    const milestone = mode === 'sales' ? row.history?.find(event => event.status === 'Confirmed')?.at : null;
    const date = new Date(milestone || row.created_at);
    const group = months.find(m => m.year === date.getFullYear() && m.month === date.getMonth());
    if (group) group.value += mode === 'sales' ? finalStatuses.includes(row.status) ? row.quote?.subtotal || 0 : 0 : 1;
  }
  return months;
}

function Chart({ series, mode, demo }) {
  const width = 645, height = 176, left = 44, bottom = 146, top = 11;
  const maxValue = Math.max(1, ...series.map(m => m.value));
  const step = mode === 'sales' ? Math.max(25000, Math.ceil(maxValue / 100000) * 25000) : Math.max(1, Math.ceil(maxValue / 4));
  const limit = step * 4;
  const nodes = series.map((m, i) => ({
    ...m, x: left + (width - left - 20) / Math.max(1, series.length - 1) * i,
    y: bottom - (bottom - top) * m.value / limit
  }));
  const points = nodes.map(p => p.x + ',' + p.y).join(' ');
  const first = nodes[0], last = nodes.at(-1);
  return <div className="chart"><svg viewBox={'0 0 ' + width + ' ' + height} role="img" aria-label={(demo ? 'Sample ' : '') + (mode === 'sales' ? 'monthly order value' : 'monthly request volume') + '. ' + series.map(m => m.label + ' ' + (mode === 'sales' ? money(m.value) : m.value)).join(', ')}>
    <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2d67ed" stopOpacity=".24"/><stop offset="100%" stopColor="#2d67ed" stopOpacity=".015"/></linearGradient></defs>
    {Array.from({length:5}, (_, i) => {
      const y = top + (bottom - top) / 4 * i, n = step * (4 - i);
      return <g key={i}><line x1={left} x2={width - 9} y1={y} y2={y} stroke="#e7edf6" strokeDasharray={i === 4 ? '' : '4 4'}/><text x={left - 8} y={y + 4} textAnchor="end">{mode === 'sales' && n ? '₹' + n / 1000 + 'k' : n}</text></g>;
    })}
    <polygon points={first.x + ',' + bottom + ' ' + points + ' ' + last.x + ',' + bottom} fill="url(#chart-fill)"/>
    <polyline points={points} fill="none" stroke="#2e64ee" strokeWidth="2.6" strokeLinejoin="round"/>
    {nodes.map((m,i) => <g key={i}><circle cx={m.x} cy={m.y} r="3.5" fill="white" stroke="#2e64ee" strokeWidth="2"><title>{m.label}: {mode === 'sales' ? money(m.value) : m.value}</title></circle>{(series.length <= 6 || i % 2 === 1) && <text x={m.x} y={168} textAnchor="middle">{m.label}</text>}</g>)}
  </svg></div>;
}

export function Dashboard({ rows, account, demo, go, onNew, onOpen, onProduct }) {
  const [period, setPeriod] = useState('6');
  const [mode, setMode] = useState('sales');
  const ordered = rows.filter(row => finalStatuses.includes(row.status));
  const sales = ordered.reduce((sum,row) => sum + (row.quote?.subtotal || 0),0);
  const firstName = account?.name.split(/\s/)[0];
  const counts = [
    ['Active requests', rows.filter(row => !['Delivered','Declined'].includes(row.status)).length, ClipboardList, 'blue', 'Across all open stages'],
    ['Quotes to review', rows.filter(row => row.status === 'Quoted').length, Clock3, 'amber', 'Awaiting dealer confirmation'],
    ['Orders in transit', rows.filter(row => row.status === 'Dispatched').length, Truck, 'violet', 'Dispatched to destination'],
    ['Confirmed order value', money(sales), Wallet, 'mint', 'Before freight and tax']
  ];
  const resaleRows = ordered.filter(row=>row.resale && row.quote);
  const realised = resaleRows.reduce((sum,row)=>sum+resaleProfit(row.quote,row.resale),0);
  const quick = [
    ['Browse product catalog','Search threads by range and application.',Package,'blue', () => go('catalog')],
    ['Estimate delivery','Check lead time and freight by PIN code.',Truck,'violet', () => go('delivery')],
    ['Calculate margins','Model markup, sale price and gross profit.',Calculator,'mint', () => go('pricing')]
  ];
  return <>
    <div className="welcome">
      <div><div className="eyebrow"><span className="eyedot"/> {account?.role==='staff' ? 'SALES WORKSPACE' : 'DEALER WORKSPACE'}{demo && <span className="demo-badge">Demo data</span>}</div><h1>{firstName ? 'Welcome back, ' + firstName : 'Dealer overview'}</h1><p>Manage product requests, plan deliveries and price your next sale.</p></div>
      <Button icon={Plus} onClick={onNew}>{account?.role === 'staff' ? 'Invite dealer' : 'New request'}</Button>
    </div>
    <section className="hero">
      <div className="hero-content">
        <div className="hero-label"><span/> VARDHMAN A&E THREADS</div>
        <h2>From thread to trade.</h2>
        <p>Find the right sewing thread, request a quote, and track your order from submission to delivery.</p>
        <button className="hero-button" onClick={() => go('catalog')}>Explore catalog <ArrowRight size={17}/></button>
      </div>
    </section>
    <section className="stats" aria-label="Workspace metrics">{counts.map(([label,value,Icon,tone,sub]) => <article className="metric" key={label}><div className={'metric-icon ' + tone}><Icon size={19}/></div><div className="metric-label">{label}</div><strong>{value}</strong><div className="metric-note">{sub}</div></article>)}</section>
    <div className="dashboard-grid">
      <section className="panel sales-panel">
        <div className="panel-head"><div><h2>Sales overview</h2><p>Confirmed orders and request activity</p></div><label className="select-compact"><span className="sr-only">Reporting period</span><select value={period} onChange={e=>setPeriod(e.target.value)}>{periodOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><ChevronDown size={14}/></label></div>
        <div className="chart-bar"><div className="switch"><button className={mode==='sales'?'selected':''} onClick={()=>setMode('sales')}>Order value</button><button className={mode==='requests'?'selected':''} onClick={()=>setMode('requests')}>Requests</button></div><span className="chart-key"><i/>{mode === 'sales' ? 'Confirmed value' : 'Requests received'}</span></div>
        <Chart series={monthSeries(rows, Number(period), mode)} mode={mode} demo={demo}/>
      </section>
      <section className="panel quick-panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Tools for your next order</p></div></div>
        <div className="quick-actions">{quick.map(([title,desc,Icon,tone,act])=><button key={title} onClick={act}><span className={'metric-icon ' + tone}><Icon size={19}/></span><span><strong>{title}</strong><small>{desc}</small></span><ArrowUpRight size={17}/></button>)}</div>
      </section>
    </div>
    {resaleRows.length>0 && <section className="panel resale-overview"><div><h2>Recorded resale profit</h2><p>Before tax · {resaleRows.length} delivered {resaleRows.length===1?'order':'orders'} with resale figures</p></div><strong>{money(realised,2)}</strong></section>}
    <section className="panel recent-panel"><div className="panel-head"><div><h2>Recent requests</h2><p>Latest quotes, orders and dispatch updates</p></div><Button variant="secondary" onClick={()=>go('requests')}>View all <ArrowRight size={15}/></Button></div>
      <RequestTable rows={rows.slice(0,4)} staff={account?.role==='staff'} onOpen={onOpen} onNew={account?.role !== 'staff' && onNew} compact/>
    </section>
    <section className="featured-panel"><div className="section-head"><div><h2>Featured products</h2><p>Thread ranges from Vardhman A&E</p></div><Button variant="secondary" onClick={()=>go('catalog')}>View catalog <ArrowRight size={15}/></Button></div>
      <div className="product-grid">{featured.map(product=><ProductCard key={product.id} product={product} onOpen={onProduct}/>)}</div>
    </section>
  </>;
}

export function Catalog({ onProduct }) {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All products');
  const [sort,setSort]=useState('Featured');
  const [limit,setLimit]=useState(16);
  const displayed = useMemo(()=>{
    const needle = query.trim().toLowerCase();
    const list = products.filter(p => (category==='All products' || (category==='Sustainable' ? p.sustainable : p.applications.includes(category))) &&
      [p.name,p.fiber,p.id,...p.applications].join(' ').toLowerCase().includes(needle));
    if(sort==='A to Z') list.sort((a,b)=>a.label.localeCompare(b.label));
    else if(category==='All products' && !needle) list.sort((a,b)=>Number(featured.includes(b))-Number(featured.includes(a)));
    return list;
  },[query,category,sort]);
  return <>
    <PageHeader label="PRODUCTS" title="Product catalog" description="Explore Vardhman A&E sewing threads by range and application." />
    <div className="panel filters"><label className="search-field"><Search size={19}/><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(16);}} placeholder="Search by product, fibre or application" aria-label="Search products"/></label>
      <div className="filter-pair"><SlidersHorizontal size={18}/><select aria-label="Application filter" value={category} onChange={e=>{setCategory(e.target.value);setLimit(16);}}>{categories.map(c=><option key={c}>{c}</option>)}</select><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option>Featured</option><option>A to Z</option></select></div></div>
    <div className="chip-row">{categories.slice(0,8).map(c=><button key={c} className={category===c?'active':''} onClick={()=>{setCategory(c);setLimit(16);}}>{c}</button>)}<button className={category==='Sustainable'?'active':''} onClick={()=>{setCategory('Sustainable');setLimit(16);}}>Sustainable</button></div>
    <div className="results-label">{displayed.length} {displayed.length===1?'product':'products'}</div>
    {displayed.length ? <div className="product-grid catalog-grid">{displayed.slice(0,limit).map(product=><ProductCard key={product.id} product={product} onOpen={onProduct}/>)}</div> :
      <div className="panel"><Blank icon={Search} title="No matching products" description="Try a different product name or application."><Button variant="secondary" onClick={()=>{setQuery('');setCategory('All products');}}>Clear filters</Button></Blank></div>}
    {displayed.length>limit && <div className="load-more"><Button variant="secondary" onClick={()=>setLimit(limit+16)}>Show more products</Button></div>}
  </>;
}

export function Requests({ rows, staff, onOpen, onNew, loading, error, refresh }) {
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('All statuses');
  const visible = rows.filter(row=>(status==='All statuses'||status===row.status) &&
    [row.id,row.company,row.payload.city,...row.payload.items.flatMap(i=>[i.name,i.article,i.shade])].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const exportRows=()=>downloadCsv('vardhman-requests.csv',[['Request','Company','Status','Date','City','PIN','Articles','Quote total INR','Tracking',...(!staff?['Recorded resale profit INR']:[])],
    ...visible.map(r=>[r.id,r.company,r.status,r.created_at,r.payload.city,r.payload.pin,r.payload.items.map(i=>i.name+' / '+i.article+' / '+i.shade+' / '+i.quantity+' '+i.unit).join('; '),r.quote?.total,r.tracking,...(!staff?[r.resale&&r.quote?resaleProfit(r.quote,r.resale):null]:[])])]);
  return <>
    <PageHeader label={staff?'SALES OPERATIONS':'DEALER WORKSPACE'} title={staff?'Dealer requests':'Requests & orders'} description={staff?'Review incoming requests, send quotes and update dispatch.':'Track every article request from submission to delivery.'}>
      <div className="button-group"><Button icon={ArrowDownToLine} variant="secondary" onClick={exportRows} disabled={!visible.length}>Export CSV</Button><Button icon={Plus} onClick={onNew}>{staff?'Invite dealer':'New request'}</Button></div>
    </PageHeader>
    <section className="panel">
      <div className="filters table-filters"><label className="search-field"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by request, article or city" aria-label="Search requests"/></label><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter requests by status"><option>All statuses</option>{stages.map(s=><option key={s}>{s}</option>)}</select></div>
      {loading ? <Blank icon={Clock3} title="Loading requests" description="Checking for the latest updates."/> : error ? <Blank icon={ClipboardList} title="Requests unavailable" description={error}><Button variant="secondary" onClick={refresh}>Retry</Button></Blank> : <RequestTable rows={visible} staff={staff} onOpen={onOpen} onNew={!staff && !rows.length && onNew}/>}
      <div className="table-footer">{visible.length} {visible.length===1?'request':'requests'}</div>
    </section>
  </>;
}

export function Resources() {
  const [group,setGroup]=useState('All resources');
  const groups=['All resources',...new Set(resources.map(r=>r[3]))];
  return <>
    <PageHeader label="VARDHMAN A&E THREADS" title="Resources & support" description="Find product literature, shade cards, technical support and existing Vardhman services." />
    <div className="chip-row resource-tabs">{groups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>setGroup(g)}>{g}</button>)}</div>
    <div className="resource-grid">{resources.filter(r=>group==='All resources'||r[3]===group).map(([title,description,path,type])=>
      <a key={title} className="panel resource" href={company+path} target="_blank" rel="noreferrer"><span className="metric-icon blue"><BookOpen size={20}/></span><span className="resource-type">{type}</span><h3>{title}</h3><p>{description}</p><span className="resource-link">Open resource <ExternalLink size={14}/></span></a>)}</div>
  </>;
}
