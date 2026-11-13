import React, { useState } from 'react';
import { ArrowDownToLine, ArrowRight, Calculator, MapPin, Trash2, Truck } from 'lucide-react';
import { estimate, money, pricing } from '../shared/commerce.js';
import { products } from './data.js';
import { Blank, Button, downloadCsv, Field, IconButton, PageHeader } from './ui.jsx';

export const units = ['Cones','Tubes','Boxes','Spools'];
export const services = ['Standard','Priority'];
export const newLine = (product = '') => ({ key: crypto.randomUUID(), product, article:'', shade:'', quantity:'', unit:'Cones', customShade:false });

export function ItemInputs({ line, onChange, onRemove, index }) {
  const change = (key,value) => onChange({...line,[key]:value});
  return <fieldset className="item-fields"><legend>Article {index+1}</legend>
    {onRemove && <IconButton className="line-remove" icon={Trash2} label={'Remove article ' + (index+1)} onClick={onRemove}/>}
    <Field label="Product"><select value={line.product} onChange={e=>change('product',e.target.value)} required>
      <option value="">Select a product</option>{products.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
    </select></Field>
    <div className="form-grid"><Field label="Article / size"><input value={line.article} onChange={e=>change('article',e.target.value)} placeholder="e.g. A002 or Tex 40" maxLength={80} required/></Field>
    <Field label="Shade name or code"><input value={line.shade} onChange={e=>change('shade',e.target.value)} placeholder="e.g. Black or NIS code" maxLength={80} required/></Field>
    <Field label="Quantity"><input type="number" min="1" max="100000" value={line.quantity} onChange={e=>change('quantity',e.target.value)} placeholder="100" required/></Field>
    <Field label="Unit"><select value={line.unit} onChange={e=>change('unit',e.target.value)}>{units.map(u=><option key={u}>{u}</option>)}</select></Field></div>
    <label className="check"><input type="checkbox" checked={line.customShade} onChange={e=>change('customShade',e.target.checked)}/> Custom shade or made-to-order requirement</label>
  </fieldset>;
}

export function EstimateResult({ result, empty = 'Enter a destination PIN and quantity to estimate delivery.' }) {
  if (!result) return <Blank icon={Truck} title="Delivery estimate" description={empty}/>;
  return <div className="estimate-result"><span className="metric-icon violet"><Truck size={22}/></span>
    <span className="eyebrow">INDICATIVE DELIVERY</span><strong>{result.min}–{result.max} business days</strong>
    <div className="total-row"><span>Estimated freight</span><b>{money(result.freight)}</b></div>
    <p>Planning estimate from order confirmation. Stock, shade and carrier availability affect the final quote.</p>
  </div>;
}

export function Delivery({ onNew }) {
  const [pin,setPin]=useState('');
  const [city,setCity]=useState('');
  const [quantity,setQuantity]=useState('100');
  const [service,setService]=useState('Standard');
  const [customShade,setCustom]=useState(false);
  const [result,setResult]=useState(null);
  function update(setter,value){setter(value);setResult(null);}
  return <>
    <PageHeader label="FULFILMENT" title="Delivery estimator" description="Estimate lead time and freight for shipments across India." />
    <div className="tool-grid">
      <form className="panel tool-panel" onSubmit={e=>{e.preventDefault();setResult(estimate(pin,[{quantity,customShade}],service));}}>
        <div className="tool-heading"><span className="metric-icon blue"><MapPin size={19}/></span><div><h2>Shipment details</h2><p>Enter the destination and order size.</p></div></div>
        <div className="form-grid"><Field label="Destination PIN"><input inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="141001" value={pin} onChange={e=>update(setPin,e.target.value)} required/></Field>
        <Field label="City"><input placeholder="Ludhiana" value={city} onChange={e=>update(setCity,e.target.value)} maxLength={100}/></Field>
        <Field label="Number of units"><input type="number" min="1" max="100000" value={quantity} onChange={e=>update(setQuantity,e.target.value)} required/></Field>
        <Field label="Service"><select value={service} onChange={e=>update(setService,e.target.value)}>{services.map(s=><option key={s}>{s}</option>)}</select></Field></div>
        <label className="check"><input type="checkbox" checked={customShade} onChange={e=>update(setCustom,e.target.checked)}/> Includes custom shades or made-to-order articles</label>
        <Button type="submit" icon={Truck}>Estimate delivery</Button>
      </form>
      <section className="panel tool-panel output-panel"><EstimateResult result={result}/>{result && onNew && <Button variant="secondary" onClick={()=>onNew({pin,city,service,quantity,customShade})}>Use in a request <ArrowRight size={16}/></Button>}</section>
    </div>
  </>;
}

const initial = { quantity:'100', unitCost:'180', freight:'450', handling:'250', markup:'20', mode:'markup', gst:'0' };
const numberFields = [
  ['quantity','Quantity',1,100000,'1'],
  ['unitCost','Purchase cost per unit (₹)',0,10000000,'0.01'],
  ['freight','Inbound freight (₹)',0,10000000,'0.01'],
  ['handling','Other selling costs (₹)',0,10000000,'0.01']
];
export function Pricing({ prefill, onReset }) {
  const [values,setValues]=useState(()=>({...initial,...prefill}));
  const update=(key,value)=>setValues(previous=>({...previous,[key]:value}));
  const numeric=Object.fromEntries(Object.keys(initial).filter(k=>k!=='mode').map(k=>[k,Number(values[k])]));
  const valid=Object.keys(numeric).every(k=>values[k]!==''&&Number.isFinite(numeric[k])&&numeric[k]>=0)
    && numberFields.every(([key,,min,max])=>numeric[key]>=min&&numeric[key]<=max) && Number.isInteger(numeric.quantity)
    && numeric.markup<=(values.mode==='margin'?99:1000)&&numeric.gst<=100;
  const result=valid ? pricing({...numeric,mode:values.mode}) : null;
  const exportResult=()=>downloadCsv('vardhman-pricing-scenario.csv',[['Metric','Value'],['Quantity',numeric.quantity],['Unit cost',numeric.unitCost],['Freight',numeric.freight],['Other costs',numeric.handling],[values.mode+' %',numeric.markup],['GST %',numeric.gst],['Landed cost',result.cost],['Sales before tax',result.revenue],['Gross profit',result.profit],['Gross margin %',result.margin.toFixed(2)],['Sale price per unit',result.perUnit],['Total incl. GST',result.total]]);
  return <>
    <PageHeader label="COMMERCIAL PLANNING" title="Pricing & margins" description="Build a selling-price scenario from purchase cost, freight and your target return."><Button icon={ArrowDownToLine} variant="secondary" disabled={!result} onClick={exportResult}>Export scenario</Button></PageHeader>
    <div className="tool-grid">
      <section className="panel tool-panel"><div className="tool-heading"><span className="metric-icon mint"><Calculator size={20}/></span><div><h2>Cost & pricing inputs</h2><p>All amounts are in INR. Enter costs before GST.</p></div></div>
        <div className="form-grid">{numberFields.map(([key,label,min,max,step])=><Field key={key} label={label}><input type="number" min={min} max={max} step={step} value={values[key]} onChange={e=>update(key,e.target.value)}/></Field>)}
          <Field label="Pricing method"><select value={values.mode} onChange={e=>update('mode',e.target.value)}><option value="markup">Markup on cost</option><option value="margin">Target gross margin</option></select></Field>
          <Field label={values.mode==='markup'?'Markup (%)':'Target margin (%)'}><input type="number" min="0" max={values.mode==='margin'?99:1000} step="0.1" value={values.markup} onChange={e=>update('markup',e.target.value)}/></Field>
          <Field label="GST (%)" hint="Enter your applicable rate."><input type="number" min="0" max="100" step="0.1" value={values.gst} onChange={e=>update('gst',e.target.value)}/></Field>
        </div>
        <Button variant="secondary" onClick={()=>{setValues(initial);onReset?.();}}>Reset inputs</Button>
      </section>
      <section className="panel tool-panel output-panel">{result ? <div className="price-output">
        <div className="price-top"><span>PROJECTED GROSS PROFIT</span><strong>{money(result.profit,2)}</strong><small>{result.margin.toFixed(2)}% gross margin</small></div>
        {[['Landed cost',result.cost],['Sale price per unit',result.perUnit],['Sales before GST',result.revenue],['GST',result.tax],['Customer total',result.total]].map(([l,v])=><div className="total-row" key={l}><span>{l}</span><b>{money(v,2)}</b></div>)}
        <p>Gross profit reflects only the costs entered here. GST is applied to the selling price and excluded from profit.</p>
      </div> : <Blank icon={Calculator} title="Check your inputs" description="Enter valid amounts and a target margin below 100%."/>}</section>
    </div>
  </>;
}
