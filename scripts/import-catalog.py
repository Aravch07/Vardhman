import concurrent.futures as cf
import html
import json
import re
from pathlib import Path
from subprocess import run

BASE = 'https://www.vardhmanthreads.com'
ROOT = Path.cwd()

def fetch(url):
    url = url.replace('http://vardhmanthreads.com', BASE).replace(' ', '%20')
    return run(["curl.exe", "--fail", "--silent", "--show-error", "--location", "--max-time", "18", url], capture_output=True, check=True).stdout

def clean(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', value)).split())

def scan(job):
    category, section, page = job
    try:
        markup = fetch(f'{BASE}/products/category/{section}?page={page}').decode('utf8', 'replace')
        rows = []
        for match in re.finditer(r'<div class="fetr-pd-img">(.*?)<h3 class="fetr-title">(.*?)</h3>\s*<p>(.*?)</p>(.*?)More details', markup, re.S):
            image, name, description, links = match.groups()
            product = re.search(r'href="([^"]+/product_detail/(\d+))"', links)
            photo = re.search(r'<img src="([^"]+)"', image)
            if not product:
                continue
            rows.append({'id': product[2], 'name': clean(name), 'fiber': clean(description), 'category': category,
                         'url': product[1], 'photo': html.unescape(photo[1]) if photo else ''})
        return rows
    except Exception as error:
        print(job, error)
        return []

def asset(row):
    url = row.pop('photo')
    if not url:
        return
    extension = url.rsplit('.',1)[-1].lower()
    if extension not in {'jpeg','jpg','png','webp'}:
        return
    path = f'/assets/products/{row["id"]}.{extension}'
    try:
        data = fetch(url)
        if len(data) > 500 and not data.lstrip().startswith(b'<'):
            (ROOT / 'public' / path.lstrip('/')).write_bytes(data)
            row['image'] = path
    except Exception as error:
        print(row['name'], error)

sections = [('Apparel',1,5),('Non-apparel',2,3),('Consumer',3,4),('Embroidery',4,2),('Footwear',5,2),('Automotive',6,2),
            ('Sustainable','sustainable-products',1),('Soft seam',11,2),('Suiting & shirting',10,2),('High elongation',9,2),('Overdyed denim',8,2),('Denim',7,2)]
jobs = [(category, section, page) for category, section, count in sections if category != 'Sustainable' for page in range(1,count+1)]
with cf.ThreadPoolExecutor(max_workers=10) as pool:
    products = {}
    for entries in pool.map(scan,jobs):
        for row in entries:
            if row['id'] not in products:
                row['applications'] = [row['category']]
                products[row['id']] = row
            elif row['category'] not in products[row['id']]['applications']:
                products[row['id']]['applications'].append(row['category'])
    list(pool.map(asset, products.values()))
logo = fetch(f'{BASE}/public/frontend/img/v-logo.png')
(ROOT/'public/assets/vardhman.png').write_bytes(logo)
(ROOT/'shared/catalog.json').write_text(json.dumps(list(products.values()), ensure_ascii=False, indent=2), encoding='utf8')
print(len(products), 'products')
for p in products.values():
    print(p['id'], p['name'], p['category'])
