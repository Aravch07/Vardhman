import catalog from '../shared/catalog.json';

const featuredIds = ['12', '21', '48', '5'];
const formatName = name => name.toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase())
  .replace(/Eco100/g, 'ECO100').replace(/ Spc/g, ' SPC');
export const products = catalog.map(p => ({ ...p, label: formatName(p.name), sustainable: /\b(ECO|NATURA)/i.test(p.name) }));
export const featured = featuredIds.map(id => products.find(p => p.id === id)).filter(Boolean);
export const categories = ['All products', 'Apparel', 'Non-apparel', 'Consumer', 'Embroidery', 'Footwear', 'Automotive', 'Denim', 'Soft seam', 'Suiting & shirting', 'High elongation', 'Overdyed denim', 'Sustainable'];

export const company = 'https://www.vardhmanthreads.com';
export const resources = [
  ['Shade cards', 'Compare official colour ranges and digital shade references.', '/shade-cards', 'Colour'],
  ['Technical service cell', 'Thread selection tools, stitch types and sewing support.', '/tech-cell', 'Technical'],
  ['Sustainable products', 'Explore Vardhman’s sustainable sewing thread range.', '/sustainable-products', 'Sustainability'],
  ['Industrial B2B portal', 'See the company’s existing industrial business portal walkthrough.', '/public/frontend/img/b2b_portal.mp4', 'Existing services'],
  ['Consumer Mobile App 2.0', 'See Vardhman’s consumer ordering app walkthrough.', '/public/frontend/img/English_vardhman_app_video.mp4', 'Existing services'],
  ['Apparel threads', 'Open the official apparel product range.', '/products/category/apparel-products', 'Catalog'],
  ['Non-apparel threads', 'Explore threads for technical and non-apparel applications.', '/products/category/non-apparel-products', 'Catalog'],
  ['Embroidery threads', 'Open the official embroidery product range.', '/products/category/embroidery-products', 'Catalog'],
  ['Consumer threads', 'Open the official tailoring and consumer range.', '/products/category/consumer-products', 'Catalog'],
  ['Zippers', 'View the company’s zipper range.', '/zipper', 'Catalog'],
  ['Global Color Palette', 'Download the official Global Color Palette.', '/public/frontend/pdf/GCP.pdf', 'Colour'],
  ['National Industry Shadecard', 'Download the official NIS shade reference.', '/public/frontend/pdf/NIS.pdf', 'Colour'],
  ['Custom colors', 'Review the company’s custom colour services.', '/colors/color-custom', 'Colour'],
  ['Thread science', 'Explore the technical details behind thread performance.', '/thread-science', 'Technical'],
  ['Technical bulletins', 'Find sewing guidance for apparel applications.', '/technical-bulletins/apparel', 'Technical'],
  ['Workshops', 'Learn about technical sewing workshops.', '/tect-workshop', 'Technical'],
  ['Certifications and awards', 'Review certifications published by Vardhman.', '/pages/certifications-awards', 'Sustainability'],
  ['Environmental programme', 'Read about environmental stewardship and the Eco-Driven programme.', '/pages/environment', 'Sustainability'],
  ['About Vardhman A&E', 'Read about the joint venture, manufacturing and distribution.', '/about', 'Company'],
  ['Contact and sales offices', 'Find official Vardhman contact information.', '/contact-us', 'Company'],
  ['News and media', 'Read updates from Vardhman A&E Threads.', '/new-media', 'Company'],
];

const today = new Date();
const demoRows = [
  ['VY-24086','Delivered','12',120,24600,1,'Ludhiana','141001'],
  ['VY-24085','Quoted','21',80,18400,2,'Delhi','110020'],
  ['VY-24084','In review','48',50,0,4,'Jaipur','302001'],
  ['VY-24083','Dispatched','5',150,37500,6,'Surat','395003'],
  ['VY-24082','Submitted','38',48,0,8,'Bengaluru','560001'],
  ['VY-24081','Confirmed','9',100,22500,10,'Mumbai','400001'],
  ['VY-24080','Delivered','12',350,72950,40,'Noida','201301'],
  ['VY-24079','Delivered','21',245,53400,68,'Pune','411001'],
  ['VY-24078','Delivered','5',365,81150,100,'Delhi','110020'],
  ['VY-24077','Delivered','48',225,47600,129,'Jaipur','302001'],
  ['VY-24076','Delivered','12',195,42100,160,'Chennai','600001'],
];
export const demoRequests = demoRows.map(([id, status, product, quantity, value, age, city, pin], index) => {
  const selected = products.find(p => p.id === product);
  const created_at = new Date(today.getTime() - age * 86400000).toISOString();
  const item = { product, name: selected?.name, article: index % 2 ? 'Tex 40' : 'Tex 60', shade: index % 2 ? 'Black' : 'Navy', quantity, unit: 'Cones' };
  const progress = ['Submitted','In review','Quoted','Confirmed','Dispatched','Delivered'];
  return { id, status, created_at, payload: { items: [item], pin, city, service: 'Standard', estimate: { min: 3, max: 5, freight: 355 }, notes: '' },
    quote: value ? { subtotal: value, total: value + 400, days: 5, freight: 400, tax: 0 } : null,
    tracking: ['Dispatched','Delivered'].includes(status) ? 'Sample carrier / VY' + id.slice(3) : null,
    history: progress.slice(0, progress.indexOf(status) + 1).map((s, i) => ({ status:s, at:new Date(Date.parse(created_at) + i * 3600000).toISOString() })) };
});

export function dateLabel(date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(date));
}
