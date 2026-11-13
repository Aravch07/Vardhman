import React, { useEffect, useRef } from 'react';
import { ArrowUpRight, Box, X } from 'lucide-react';
import { money } from '../shared/commerce.js';
import { dateLabel, products } from './data.js';

export function Button({ children, icon: Icon, variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={'button ' + variant + ' ' + className} {...props}>{Icon && <Icon size={17} />}{children}</button>;
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return <button type="button" className={'icon-button ' + className} title={label} aria-label={label} {...props}><Icon size={19} /></button>;
}

export function Modal({ title, subtitle, children, onClose, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <header className="dialog-header"><div><h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton icon={X} label="Close dialog" onClick={onClose} /></header>
    <div className="dialog-body">{children}</div>
  </dialog>;
}

export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Status({ status }) {
  return <span className={'status status-' + status.toLowerCase().replaceAll(' ', '-')}>{status}</span>;
}

export function Blank({ icon: Icon = Box, title, description, children }) {
  return <div className="blank"><span className="blank-icon"><Icon size={23} /></span><h3>{title}</h3><p>{description}</p>{children}</div>;
}

export function PageHeader({ label, title, description, children }) {
  return <div className="page-title"><div>{label && <div className="eyebrow">{label}</div>}<h1>{title}</h1><p>{description}</p></div>{children}</div>;
}

export function ProductCard({ product, onOpen }) {
  return <button className="product-card" onClick={() => onOpen(product)}>
    <div className="product-image">{product.image ? <img src={product.image} alt="" loading="lazy" /> : <Box size={42} />}{product.sustainable && <span className="eco">Sustainable</span>}</div>
    <div className="product-info"><div><span>{product.category}</span><strong>{product.label}</strong></div><ArrowUpRight size={17} /></div>
  </button>;
}

export function RequestTable({ rows, onOpen, staff, compact, onNew }) {
  if (!rows.length) return <Blank title="No requests here yet" description="Article requests and their latest updates appear here.">{onNew && <Button variant="secondary" onClick={onNew}>Create a request</Button>}</Blank>;
  return <div className="table-scroll"><table>
    <thead><tr><th>Request ID</th><th>{staff ? 'Dealer / article' : 'Article'}</th><th>Date</th><th>Status</th>{!compact && <th>Quote total</th>}<th><span className="sr-only">Details</span></th></tr></thead>
    <tbody>{rows.map(row => {
      const item = row.payload.items[0];
      const label = products.find(p => p.id === item.product)?.label || item.name;
      return <tr key={row.id}>
        <td><button className="table-id" onClick={() => onOpen(row.id)}>{row.id}</button></td>
        <td><div className="table-product">{staff ? row.company || 'Dealer' : label}</div><small>{staff ? label : item.quantity + ' ' + item.unit.toLowerCase()}{row.payload.items.length > 1 ? ' +' + (row.payload.items.length - 1) + ' lines' : ''}</small></td>
        <td className="no-wrap">{dateLabel(row.created_at)}</td><td><Status status={row.status} /></td>
        {!compact && <td className="no-wrap">{row.quote ? money(row.quote.total, 2) : '—'}</td>}
        <td><IconButton icon={ArrowUpRight} label={'View ' + row.id} onClick={() => onOpen(row.id)} /></td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export function ErrorText({ children }) {
  return children ? <p className="error" role="alert">{children}</p> : null;
}

export async function api(action, body) {
  const options = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch('/api/portal?action=' + action, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Unable to connect. Please try again.');
  return data;
}

export function downloadCsv(filename, rows) {
  const encode = value => {
    const raw = String(value ?? '');
    const safe = /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const file = new Blob(['\ufeff', rows.map(row => row.map(encode).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
