import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Product } from '../types';

/**
 * Initializes a BrowserMultiFormatReader configured for supermarket barcodes
 */
export function createZXingBarcodeReader(): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, any>();
  const formats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
  ];

  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true);

  return new BrowserMultiFormatReader(hints, 300);
}

/**
 * Plays a pleasant pos scanner confirmation beep (880Hz, 90ms)
 */
export function playBarcodeBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(860, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // ignore audio policy restrictions
  }
}

/**
 * Triggers haptic feedback across Web and Telegram WebApp
 */
export function triggerHapticFeedback(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 20, 40]);
    }
  } catch {}

  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('success');
    }
  } catch {}
}

/**
 * Normalizes barcode strings and checks for exact, stripped, or UPC/EAN-13 conversions
 */
export function isBarcodeMatch(productBarcode?: string, targetBarcode?: string): boolean {
  if (!productBarcode || !targetBarcode) return false;

  const p = productBarcode.trim().toLowerCase();
  const t = targetBarcode.trim().toLowerCase();
  if (p === t) return true;

  const pDigits = p.replace(/\D/g, '');
  const tDigits = t.replace(/\D/g, '');

  if (pDigits && tDigits) {
    if (pDigits === tDigits) return true;

    // EAN-13 leading 0 vs 12-digit UPC (e.g. 012345678901 vs 12345678901)
    if (pDigits.length === 13 && pDigits.startsWith('0') && pDigits.slice(1) === tDigits) return true;
    if (tDigits.length === 13 && tDigits.startsWith('0') && tDigits.slice(1) === pDigits) return true;

    // Substring match if scanned barcode has 8+ digits
    if (tDigits.length >= 8 && (pDigits.endsWith(tDigits) || tDigits.endsWith(pDigits))) {
      return true;
    }
  }

  return false;
}

/**
 * Finds matching product in products list by scanned barcode
 */
export function findProductByScannedBarcode(products: Product[], scannedBarcode: string): Product | undefined {
  if (!scannedBarcode || !scannedBarcode.trim()) return undefined;
  const clean = scannedBarcode.trim();

  // 1. Exact match first
  const exact = products.find((p) => (p.barcode || '').trim().toLowerCase() === clean.toLowerCase());
  if (exact) return exact;

  // 2. Normalized numeric match
  const matched = products.find((p) => isBarcodeMatch(p.barcode, clean));
  if (matched) return matched;

  // 3. Fallback check on SKU
  const skuMatch = products.find((p) => (p.sku || '').trim().toLowerCase() === clean.toLowerCase());
  return skuMatch;
}

export const findProductByBarcode = findProductByScannedBarcode;

/**
 * Universal safe camera constraints for iOS Safari & Android
 */
export function getCameraBarcodeConstraints() {
  return {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };
}

/**
 * Decodes barcode directly from an image file/blob with multi-pass resolution and contrast enhancement (ideal for iPhone cameras)
 */
export async function decodeBarcodeFromImage(fileOrBlob: File | Blob): Promise<string | null> {
  const reader = createZXingBarcodeReader();
  const url = URL.createObjectURL(fileOrBlob);

  try {
    // Pass 1: Direct decode from original image URL
    try {
      const result = await reader.decodeFromImageUrl(url);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch {
      // Continue to canvas fallback
    }

    // Pass 2: Resize & optimize for iPhone large photo formats via Canvas
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const maxDim = 1280;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Attempt decode from scaled canvas data URL
          const scaledDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          try {
            const scaledResult = await reader.decodeFromImageUrl(scaledDataUrl);
            if (scaledResult && scaledResult.getText()) {
              resolve(scaledResult.getText().trim());
              return;
            }
          } catch {}

          // Pass 3: Grayscale / High-contrast pass for barcodes under shadows
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
            // Boost contrast
            const contrast = gray > 128 ? Math.min(255, gray + 40) : Math.max(0, gray - 40);
            d[i] = contrast;
            d[i + 1] = contrast;
            d[i + 2] = contrast;
          }
          ctx.putImageData(imgData, 0, 0);

          const contrastDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const contrastResult = await reader.decodeFromImageUrl(contrastDataUrl);
          if (contrastResult && contrastResult.getText()) {
            resolve(contrastResult.getText().trim());
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
    try {
      reader.reset();
    } catch {}
  }
}

