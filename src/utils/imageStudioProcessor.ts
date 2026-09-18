export interface StudioProcessOptions {
  backgroundMode?: 'studio_white' | 'soft_gradient' | 'warm_studio' | 'original';
  fitMode?: 'contain' | 'smart_cover'; // contain = preserve all, smart_cover = fill square without borders
  paddingPercent?: number; // 0 to 25% (default 3%)
  enhanceContrast?: boolean;
  brightness?: number; // -50 to 50 (default 2)
  contrast?: number; // -50 to 50 (default 8)
  saturation?: number; // -50 to 50 (default 6)
  addGroundShadow?: boolean;
  rotation?: number; // 0, 90, 180, 270
  zoom?: number; // 0.6 to 2.5 (default 1.0)
  outputSize?: number; // default 900
  quality?: number; // 0.1 to 1.0 (default 0.92)
}

export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  originalSizeEstimate: number;
  processedSizeEstimate: number;
}

/**
 * Loads an image from File, Blob, or Data URL / HTTP URL into an HTMLImageElement
 */
export function loadImageElement(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error("Rasm yuklab bo'lmadi yoki format qo'llab-quvvatlanmaydi"));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error("Faylni o'qishda xatolik yuz berdi"));
        }
      };
      reader.onerror = () => reject(new Error("Fayl o'qilmadi"));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Applies intelligent studio montage to any product photo:
 * - High resolution 1:1 square canvas (900x900)
 * - Never shrinks live photos: supports smart_cover to fill frame and contain with minimal padding
 * - Studio pure white / gradient backdrop
 * - Optional grounding contact shadow for 3D realism
 * - Contrast, brightness and vibrance optimization for crisp catalog view
 * - Super-fast client-side Canvas processing
 */
export async function processProductImage(
  source: File | Blob | string,
  options: StudioProcessOptions = {}
): Promise<ProcessedImageResult> {
  const {
    backgroundMode = 'studio_white',
    fitMode = 'smart_cover',
    paddingPercent = 3,
    enhanceContrast = true,
    brightness = 2,
    contrast = 8,
    saturation = 6,
    addGroundShadow = true,
    rotation = 0,
    zoom = 1.0,
    outputSize = 900,
    quality = 0.92,
  } = options;

  const img = await loadImageElement(source);

  // Setup offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D kontekstini yaratib bo‘lmadi');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw Background
  if (backgroundMode === 'studio_white') {
    // Crisp studio white with very soft radial lighting vignette
    const bgGrad = ctx.createRadialGradient(
      outputSize / 2,
      outputSize / 2,
      outputSize * 0.15,
      outputSize / 2,
      outputSize / 2,
      outputSize * 0.75
    );
    bgGrad.addColorStop(0, '#FFFFFF');
    bgGrad.addColorStop(0.7, '#FAFAFA');
    bgGrad.addColorStop(1, '#F3F4F6');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, outputSize, outputSize);
  } else if (backgroundMode === 'soft_gradient') {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, outputSize);
    bgGrad.addColorStop(0, '#FFFFFF');
    bgGrad.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, outputSize, outputSize);
  } else if (backgroundMode === 'warm_studio') {
    const bgGrad = ctx.createRadialGradient(
      outputSize / 2,
      outputSize / 2,
      outputSize * 0.1,
      outputSize / 2,
      outputSize / 2,
      outputSize * 0.7
    );
    bgGrad.addColorStop(0, '#FFFDF7');
    bgGrad.addColorStop(1, '#F5F0E6');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, outputSize, outputSize);
  } else {
    // Pure clean white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputSize, outputSize);
  }

  // 2. Calculate Bounding Box & Sizing
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  // Account for 90 or 270 deg rotation
  const isRotatedQuarter = rotation === 90 || rotation === 270;
  const effectiveWidth = isRotatedQuarter ? origHeight : origWidth;
  const effectiveHeight = isRotatedQuarter ? origWidth : origHeight;

  // Maximum allowed dimension within padding
  const paddingPx = (outputSize * (Math.max(0, paddingPercent) / 100));
  const maxAvailableWidth = outputSize - paddingPx * 2;
  const maxAvailableHeight = outputSize - paddingPx * 2;

  let scale = 1.0;
  if (fitMode === 'smart_cover') {
    // Fill the frame so the product dominates the card prominently (zero empty sidebars)
    const baseScale = Math.max(
      outputSize / effectiveWidth,
      outputSize / effectiveHeight
    );
    scale = baseScale * zoom;
  } else {
    // Contain within padding
    const baseScale = Math.min(
      maxAvailableWidth / effectiveWidth,
      maxAvailableHeight / effectiveHeight
    );
    scale = baseScale * zoom;
  }

  const drawWidth = origWidth * scale;
  const drawHeight = origHeight * scale;

  // 3. Draw Grounding Studio Shadow (only if contain mode or when margin allows)
  if (addGroundShadow && fitMode === 'contain' && paddingPercent >= 4) {
    const shadowWidth = (isRotatedQuarter ? drawHeight : drawWidth) * 0.75;
    const shadowHeight = shadowWidth * 0.12;
    const shadowCenterY = outputSize / 2 + ((isRotatedQuarter ? drawWidth : drawHeight) / 2) - (shadowHeight * 0.25);
    const shadowCenterX = outputSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(shadowCenterX, shadowCenterY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
    const shadowGrad = ctx.createRadialGradient(
      shadowCenterX,
      shadowCenterY,
      0,
      shadowCenterX,
      shadowCenterY,
      shadowWidth / 2
    );
    shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.20)');
    shadowGrad.addColorStop(0.4, 'rgba(15, 23, 42, 0.10)');
    shadowGrad.addColorStop(0.8, 'rgba(15, 23, 42, 0.02)');
    shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();
  }

  // 4. Render Product Image with Rotation & Filters
  ctx.save();
  ctx.translate(outputSize / 2, outputSize / 2);

  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // CSS Filters on canvas for high vibrancy and crisp contrast
  if (enhanceContrast) {
    const brightPct = Math.max(50, 100 + brightness);
    const contrastPct = Math.max(50, 100 + contrast);
    const satPct = Math.max(50, 100 + saturation);
    ctx.filter = `brightness(${brightPct}%) contrast(${contrastPct}%) saturate(${satPct}%)`;
  }

  ctx.drawImage(
    img,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
  ctx.restore();

  // 5. Export as High Quality WebP (fallback to JPEG)
  let dataUrl = '';
  try {
    dataUrl = canvas.toDataURL('image/webp', quality);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
  } catch {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const processedSizeEstimate = Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    width: outputSize,
    height: outputSize,
    originalSizeEstimate: (origWidth * origHeight * 4),
    processedSizeEstimate,
  };
}
