import urllib.request
import re
import json
import time

def lookup_barcode(barcode):
    url = f"https://barcode-list.ru/barcode/RU/Search.htm?barcode={barcode}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=7) as resp:
            html = resp.read().decode('utf-8', errors='replace')
            
            # Find the table rows in randomBarcodes
            table_match = re.search(r'<table[^>]*class=["\']randomBarcodes["\'][^>]*>(.*?)</table>', html, re.DOTALL | re.IGNORECASE)
            if not table_match:
                return []
            
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_match.group(1), re.DOTALL | re.IGNORECASE)
            results = []
            for r in rows:
                cols = re.findall(r'<td[^>]*>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
                if len(cols) >= 5:
                    num = cols[0].strip()
                    code = cols[1].strip()
                    name = re.sub(r'<[^>]+>', '', cols[2]).strip()
                    unit = cols[3].strip()
                    rating_str = re.sub(r'[^\d]', '', cols[4])
                    rating = int(rating_str) if rating_str else 0
                    if name:
                        results.append({
                            'name': name,
                            'unit': unit,
                            'rating': rating
                        })
            return results
    except Exception as e:
        # print(f"Error {barcode}: {e}")
        return []

if __name__ == '__main__':
    with open('regos_live_products.json') as f:
        prods = json.load(f)
    
    # Test first 20 products that have 13-digit barcode
    count = 0
    matched = 0
    for p in prods:
        b = str(p.get('barcode', '')).strip()
        if len(b) == 13:
            count += 1
            items = lookup_barcode(b)
            if items:
                matched += 1
                best = items[0]
                print(f"[{count}] {b} -> Found {len(items)} items. Best: '{best['name']}' (Rating {best['rating']}) | Current: '{p.get('nameUz')}'")
            else:
                print(f"[{count}] {b} -> No match | Current: '{p.get('nameUz')}'")
            time.sleep(0.3)
            if count >= 15:
                break
    print(f"\nSummary: {matched}/{count} matched!")
