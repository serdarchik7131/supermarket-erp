import https from 'https';
import http from 'http';

export interface BarcodeCandidate {
  name: string;
  measure?: string;
  rating: number;
  source: 'barcode-list.com' | 'barcode-list.ru' | 'openfoodfacts';
}

export interface BarcodeResolutionResult {
  barcode: string;
  found: boolean;
  originalName: string;
  verifiedName?: string;
  nameRu?: string;
  rating?: number;
  source?: string;
  message?: string;
}

/**
 * Clean and standardize product names to clean supermarket title-case
 */
export function cleanSupermarketName(rawName: string): string {
  if (!rawName) return '';
  let clean = rawName
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // If the entire text is UPPERCASE, convert to Title Case
  if (clean.length > 3 && clean === clean.toUpperCase()) {
    clean = clean
      .split(' ')
      .map((word, idx) => {
        // Keep units like 1L, 0.5L, 250ML, 500G intact
        if (/^\d+(\.\d+)?(L|ML|KG|G|GR|LITR|LITRE)$/i.test(word)) {
          return word.toUpperCase();
        }
        if (word.length <= 1) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  return clean;
}

function fetchWithTimeout(url: string, headers: Record<string, string> = {}, timeoutMs = 5000): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,uz;q=0.8,en;q=0.7',
            ...headers,
          },
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode || 200, body: data });
          });
        }
      );

      req.on('error', () => {
        resolve({ status: 500, body: '' });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 504, body: '' });
      });

      req.end();
    } catch {
      resolve({ status: 500, body: '' });
    }
  });
}

/**
 * Scrape barcode-list.ru or barcode-list.com
 */
async function queryBarcodeListSite(barcode: string, domain: 'barcode-list.ru' | 'barcode-list.com'): Promise<BarcodeCandidate[]> {
  const lang = domain === 'barcode-list.ru' ? 'RU' : 'EN';
  const url = `https://${domain}/barcode/${lang}/Search.htm?barcode=${encodeURIComponent(barcode)}`;
  
  const res = await fetchWithTimeout(url, {
    'Referer': `https://${domain}/`,
  }, 4000);

  if (res.status !== 200 || !res.body || !res.body.includes('randomBarcodes')) {
    return [];
  }

  const candidates: BarcodeCandidate[] = [];
  // Match rows in <table class="randomBarcodes">
  const rowMatches = res.body.matchAll(/<tr[^>]*class=["']?(?:even|odd)["']?[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const match of rowMatches) {
    const rowHtml = match[1];
    const cols = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m => m[1].replace(/<[^>]*>/g, '').trim());
    
    // Columns: [0]: index, [1]: barcode, [2]: product name, [3]: measure, [4]: rating
    if (cols.length >= 3) {
      const rowBarcode = (cols[1] || '').replace(/\D/g, '');
      const targetBarcode = barcode.replace(/\D/g, '');

      // 100% STRICT VERIFICATION: The barcode in the table row MUST match the searched barcode!
      if (rowBarcode !== targetBarcode) {
        continue;
      }

      const name = cols[2];
      const measure = cols[3] || '';
      const ratingStr = cols[4] || '1';
      const rating = parseInt(ratingStr.replace(/\D/g, ''), 10) || 1;

      // Only add meaningful measurement (exclude generic 'ШТ.', 'ШТ', 'DONA', 'PCS')
      let cleanMeasure = '';
      if (measure && !/^(ШТ\.?|DONA|PCS|ШТУКА)$/i.test(measure.trim())) {
        cleanMeasure = measure.trim();
      }

      if (name && name.length >= 2) {
        candidates.push({
          name: cleanSupermarketName(name),
          measure: cleanMeasure || undefined,
          rating,
          source: domain,
        });
      }
    }
  }

  // Sort by rating descending
  candidates.sort((a, b) => b.rating - a.rating);
  return candidates;
}

/**
 * Open Food Facts fallback (high accuracy, millions of verified barcodes, official JSON API)
 */
async function queryOpenFoodFacts(barcode: string): Promise<BarcodeCandidate | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetchWithTimeout(url, {
    'Accept': 'application/json',
  }, 3500);

  if (res.status === 200 && res.body) {
    try {
      const data = JSON.parse(res.body);
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name_ru || p.product_name_uz || p.product_name_en || p.product_name;
        if (name && name.trim().length >= 2) {
          let cleanName = name.trim();
          
          // If product name doesn't mention primary brand, add only the main primary brand (first brand before comma)
          if (p.brands) {
            const primaryBrand = p.brands.split(',')[0].trim();
            if (primaryBrand && !cleanName.toLowerCase().includes(primaryBrand.toLowerCase()) && !primaryBrand.includes('SERVICES') && !primaryBrand.includes('SA/NV')) {
              cleanName = `${primaryBrand} ${cleanName}`;
            }
          }
          
          if (p.quantity && !cleanName.toLowerCase().includes(p.quantity.toLowerCase())) {
            cleanName = `${cleanName} ${p.quantity}`;
          }

          return {
            name: cleanSupermarketName(cleanName),
            rating: 100, // Open Food Facts has official product status
            source: 'openfoodfacts',
          };
        }
      }
    } catch {
      // ignore json parse error
    }
  }
  return null;
}

/**
 * Resolve single barcode with strict verification
 * 1. Queries barcode-list.ru
 * 2. Queries barcode-list.com
 * 3. Falls back to Open Food Facts
 * 4. If not found, returns found: false (ORIGINAL IS UNTOUCHED)
 */
export async function resolveBarcodeItem(barcode: string, currentName: string = ''): Promise<BarcodeResolutionResult> {
  const cleanBarcode = String(barcode || '').trim();
  if (!cleanBarcode || cleanBarcode.length < 5) {
    return {
      barcode: cleanBarcode,
      found: false,
      originalName: currentName,
      message: 'Shtrix-kod noto\'g\'ri yoki juda qisqa',
    };
  }

  // 1. Check barcode-list.ru first (best for Russian/Cyrillic goods)
  let candidates = await queryBarcodeListSite(cleanBarcode, 'barcode-list.ru');

  // 2. If no result, check barcode-list.com
  if (candidates.length === 0) {
    candidates = await queryBarcodeListSite(cleanBarcode, 'barcode-list.com');
  }

  if (candidates.length > 0) {
    const best = candidates[0];
    let finalVerifiedName = best.name;
    if (best.measure && !finalVerifiedName.toLowerCase().includes(best.measure.toLowerCase())) {
      finalVerifiedName = `${finalVerifiedName} ${best.measure}`;
    }

    return {
      barcode: cleanBarcode,
      found: true,
      originalName: currentName,
      verifiedName: cleanSupermarketName(finalVerifiedName),
      rating: best.rating,
      source: best.source,
      message: `Barcode-List dan topildi (Reyting: ${best.rating})`,
    };
  }

  // 3. Fallback to Open Food Facts (global barcode database)
  const offCandidate = await queryOpenFoodFacts(cleanBarcode);
  if (offCandidate) {
    return {
      barcode: cleanBarcode,
      found: true,
      originalName: currentName,
      verifiedName: offCandidate.name,
      rating: offCandidate.rating,
      source: 'openfoodfacts',
      message: 'Open Food Facts dan tasdiqlandi',
    };
  }

  // 4. If not found on any source: KEEP ORIGINAL 100% UNTOUCHED
  return {
    barcode: cleanBarcode,
    found: false,
    originalName: currentName,
    message: 'Topilmadi, asl nomi o\'zgarishsiz saqlandi',
  };
}
