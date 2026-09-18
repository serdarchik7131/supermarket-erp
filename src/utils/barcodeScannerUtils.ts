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
 * Decodes barcode directly from an image file/blob
 */
export async function decodeBarcodeFromImage(fileOrBlob: File | Blob): Promise<string | null> {
  const reader = createZXingBarcodeReader();
  const url = URL.createObjectURL(fileOrBlob);
  try {
    const result = await reader.decodeFromImageUrl(url);
    if (result) {
      return result.getText();
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
    reader.reset();
  }
}
