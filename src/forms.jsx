import React, { useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Calculator, Check, Copy, Eye, EyeOff, KeyRound, LockKeyhole, Mail, Plus, Send, Truck } from 'lucide-react';
import { estimate, money, transitions } from '../shared/commerce.js';
import { company, dateLabel, products } from './data.js';
import { api, Button, downloadCsv, ErrorText, Field, IconButton, Status } from './ui.jsx';
import { EstimateResult, ItemInputs, newLine, services } from './tools.jsx';

export function AuthForm({ onAccount, invitation, onDemo }) {
  const [mode,setMode]=useState(invitation ? 'register' : 'login');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [visible,setVisible]=useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);setError('');
    try {
      const {account}=await api(mode,Object.fromEntries(new FormData(e.currentTarget)));
      onAccount(account);
    } catch(error) {setError(error.message);}
    finally {setBusy(false);}
  }
  function switchMode(){setMode(mode==='login'?'register':'login');setError('');}
  return <form onSubmit={submit} className="auth-form">
    <div className="auth-mark"><LockKeyhole size={23}/></div>
    {mode==='register' && <div className="form-grid"><Field label="Full name"><input name="name" autoComplete="name" maxLength={100} required /></Field><Field label="Company"><input name="company" autoComplete="organization" maxLength={120} required /></Field></div>}
    <Field label="Work email"><input name="email" type="email" autoComplete="email" placeholder="name@company.com" maxLength={254} required /></Field>
    <Field label="Password" hint={mode==='register'?'At least 12 characters.':null}><div className="password-field"><input name="password" type={visible?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} maxLength={128} required/><IconButton icon={visible?EyeOff:Eye} label={visible?'Hide password':'Show password'} onClick={()=>setVisible(!visible)}/></div></Field>
    {mode==='register' && <Field label="Invitation code"><input name="invite" defaultValue={invitation || ''} autoComplete="off" required /></Field>}
    <ErrorText>{error}</ErrorText>
    <Button type="submit" icon={mode==='register'?KeyRound:ArrowRight} disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Activate account'}</Button>
    <div className="auth-links"><button type="button" className="text-button" onClick={switchMode}>{mode==='login'?'Activate an invitation':'Back to sign in'}</button>{onDemo && <button type="button" className="text-button" onClick={onDemo}>Return to demo</button>}</div>
  </form>;
}

export function ProductDetails({ product, onNew }) {
  return <div className="product-detail">
    <div className="product-detail-image"><img src={product.image} alt={product.label}/></div>
    <div><span className="eyebrow">{product.category.toUpperCase()}</span><h3>{product.label}</h3><p>{product.fiber}</p>
      <div className="detail-tags">{product.applications.map(a=><span key={a}>{a}</span>)}{product.sustainable && <span>Sustainable range</span>}</div>
      <p>Use the product specifications and shade cards to identify the exact article, thread size and colour you want to request.</p>
      <a className="resource-link" href={product.url} target="_blank" rel="noreferrer">Official product specifications <ArrowUpRight size={16}/></a><br/>
      <a className="resource-link" href={company+'/shade-cards'} target="_blank" rel="noreferrer">Official shade cards <ArrowUpRight size={16}/></a>
      {onNew && <div className="detail-action"><Button icon={Plus} onClick={()=>onNew({product:product.id})}>Request this product</Button></div>}
    </div>
  </div>;
}

export function RequestForm({ initial, onSubmit, demo }) {
  const [draft,setDraft]=useState(()=>({ items:[{...newLine(initial?.product),quantity:initial?.quantity||'',customShade:!!initial?.customShade}], city:initial?.city||'', pin:initial?.pin||'', service:initial?.service||'Standard', notes:'' }));
  const [key]=useState(()=>crypto.randomUUID());
  const [review,setReview]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const update=(field,value)=>setDraft(p=>({...p,[field]:value}));
  const projection=estimate(draft.pin,draft.items,draft.service);
  async function submit(e){
    e.preventDefault();
    if (!review) {setReview(true);return;}
    setBusy(true);setError('');
    try {await onSubmit({...draft,key});}
    catch(error){setError(error.message);}
    finally {setBusy(false);}
  }
  return <form onSubmit={submit}>
    <div className="step-row"><span className={!review?'on':''}><i>{review?<Check size={12}/>:1}</i> Request details</span><span className={review?'on':''}><i>2</i> Review & submit</span></div>
    {!review ? <>
      <div className="request-fields">{draft.items.map((line,index)=><ItemInputs key={line.key} line={line} index={index}
        onChange={value=>update('items',draft.items.map(item=>item.key===line.key?value:item))}
        onRemove={draft.items.length>1?()=>update('items',draft.items.filter(item=>item.key!==line.key)):null}/>)}</div>
      {draft.items.length<25 && <Button icon={Plus} variant="secondary" onClick={()=>update('items',[...draft.items,newLine()])}>Add another article</Button>}
      <div className="form-grid delivery-fields"><Field label="Destination city"><input value={draft.city} maxLength={100} onChange={e=>update('city',e.target.value)} required/></Field>
      <Field label="Destination PIN"><input value={draft.pin} maxLength={6} inputMode="numeric" pattern="[1-9][0-9]{5}" onChange={e=>update('pin',e.target.value)} required/></Field>
      <Field label="Delivery service"><select value={draft.service} onChange={e=>update('service',e.target.value)}>{services.map(s=><option key={s}>{s}</option>)}</select></Field></div>
      <Field label="Notes (optional)"><textarea maxLength={1000} value={draft.notes} onChange={e=>update('notes',e.target.value)} placeholder="Packaging, application or requested delivery date"/></Field>
    </> : <div className="review-grid">
      <div><h3>Requested articles</h3><ArticleList items={draft.items}/><h3>Delivery destination</h3><p>{draft.city} {draft.pin} · {draft.service}</p>{draft.notes && <p className="preserve">{draft.notes}</p>}</div>
      <div className="review-estimate"><EstimateResult result={projection}/></div>
    </div>}
    <ErrorText>{error}</ErrorText>
    <div className="dialog-actions">{review && <Button variant="secondary" icon={ArrowLeft} onClick={()=>setReview(false)}>Edit details</Button>}<Button type="submit" icon={review?Send:ArrowRight} disabled={busy}>{busy?'Submitting…':review?demo?'Submit demo request':'Submit request':'Review request'}</Button></div>
  </form>;
}

function ArticleList({ items }) {
  return <ul className="article-list">{items.map((item,i)=><li key={i}><div><strong>{products.find(p=>p.id===item.product)?.label || item.name}</strong><small>{item.article} · {item.shade}{item.customShade?' · Custom shade':''}</small></div><span>{item.quantity} {item.unit.toLowerCase()}</span></li>)}</ul>;
}

export function RequestDetails({ row, staff, onChange, onPrice, demo }) {
  const [pending,setPending]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const {payload,quote}=row;
  const next=(transitions[row.status] || []).filter(s=>staff?s!=='Confirmed':['Confirmed','Declined'].includes(s));
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');
    try {await onChange({id:row.id,status:pending,...Object.fromEntries(new FormData(e.currentTarget))});setPending('');}
    catch(error){setError(error.message);}
    finally {setBusy(false);}
  }
  function exportQuote() {
    downloadCsv(row.id + '-quote.csv', [
      ['Request',row.id],['Status',row.status],['City',payload.city],['PIN',payload.pin],
      ['Product','Article','Shade','Quantity','Unit'],...payload.items.map(i=>[i.name,i.article,i.shade,i.quantity,i.unit]),
      ['Subtotal INR',quote.subtotal],['Freight INR',quote.freight],['Tax INR',quote.tax],['Total INR',quote.total],['Lead time business days',quote.days],['Notes',quote.note]
    ]);
  }
  return <div className="request-detail">
    <div className="detail-status"><Status status={row.status}/><span>{dateLabel(row.created_at)}{row.company?' · '+row.company:''}</span></div>
    <div className="review-grid"><div>
      <h3>Requested articles</h3><ArticleList items={payload.items}/>
      <h3>Delivery</h3><p>{payload.city} {payload.pin} · {payload.service}</p>
      <p>{payload.estimate.min}–{payload.estimate.max} business days indicative · {money(payload.estimate.freight)} estimated freight</p>
      {row.tracking && <div className="tracking"><Truck size={18}/> <span>{row.tracking}</span></div>}
      {payload.notes && <><h3>Request notes</h3><p className="preserve">{payload.notes}</p></>}
    </div><div>
      <h3>Status history</h3><ol className="timeline">{row.history.map((entry,i)=><li key={i}><i/><div><strong>{entry.status}</strong><small>{dateLabel(entry.at)}</small></div></li>)}</ol>
    </div></div>
    {quote && <div className="quote-panel"><div className="quote-head"><h3>{demo?'Sample quote':'Sales quote'}</h3><Button icon={ArrowDownToLine} variant="secondary" onClick={exportQuote}>Export quote</Button></div>
      {[['Article subtotal',quote.subtotal],['Freight',quote.freight],['Tax',quote.tax],['Quote total',quote.total]].map(([label,v])=><div className="total-row" key={label}><span>{label}</span><b>{money(v,2)}</b></div>)}
      <p>{quote.days} business days lead time{quote.note?' · '+quote.note:''}</p>
      {onPrice && <Button icon={Calculator} variant="secondary" onClick={()=>onPrice(quote,payload.items)}>Model resale margin</Button>}
    </div>}
    {!!next.length && <div className="button-group detail-action">{next.map(s=><Button key={s} variant={s==='Declined'?'secondary':'primary'} onClick={()=>{setPending(s);setError('');}}>{({Quoted:'Send quote',Confirmed:'Accept quote',Declined:'Decline','In review':'Start review',Dispatched:'Record dispatch',Delivered:'Mark delivered'})[s]}</Button>)}</div>}
    {pending && <form className="quote-panel" onSubmit={submit}>
      <h3>{pending==='Quoted'?'Prepare sales quote':pending==='Dispatched'?'Dispatch details':'Confirm status change'}</h3>
      {pending==='Quoted' && <><div className="form-grid">
        <Field label="Article subtotal (₹)"><input name="subtotal" type="number" min=".01" max="1000000000" step=".01" required/></Field>
        <Field label="Freight (₹)"><input name="freight" type="number" min="0" max="1000000000" step=".01" defaultValue={payload.estimate.freight} required/></Field>
        <Field label="Tax (₹)"><input name="tax" type="number" min="0" max="1000000000" step=".01" defaultValue="0" required/></Field>
        <Field label="Lead time in business days"><input name="days" type="number" min="1" max="120" defaultValue={payload.estimate.max} required/></Field>
      </div><Field label="Quote notes (optional)"><textarea name="note" maxLength={1000}/></Field></>}
      {pending==='Dispatched' && <Field label="Carrier and tracking reference"><input name="tracking" maxLength={120} required/></Field>}
      {!['Quoted','Dispatched'].includes(pending) && <p>Update {row.id} to {pending.toLowerCase()}?</p>}
      <ErrorText>{error}</ErrorText>
      <div className="button-group"><Button variant="secondary" onClick={()=>setPending('')}>Cancel</Button><Button type="submit" disabled={busy}>{busy?'Saving…':pending==='Quoted'?'Send quote':'Confirm'}</Button></div>
    </form>}
  </div>;
}

export function InviteForm() {
  const [link,setLink]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');
    try {const {invite}=await api('invite',Object.fromEntries(new FormData(e.currentTarget)));setLink(location.origin+'/#invite='+invite);}
    catch(error){setError(error.message);}
    finally{setBusy(false);}
  }
  return link ? <div className="auth-form"><p>Share this single-use link with the dealer. It expires in seven days.</p><Field label="Invitation link"><input value={link} readOnly onFocus={e=>e.target.select()}/></Field><Button icon={copied?Check:Copy} onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setError('Select and copy the link above.');}}}>{copied?'Copied':'Copy link'}</Button><ErrorText>{error}</ErrorText></div> :
    <form className="auth-form" onSubmit={submit}><Field label="Dealer work email"><input type="email" name="email" placeholder="dealer@company.com" required/></Field><ErrorText>{error}</ErrorText><Button type="submit" icon={Mail} disabled={busy}>{busy?'Creating…':'Generate invitation'}</Button></form>;
}
