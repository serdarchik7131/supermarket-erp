import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Link,
  Sparkles,
  RotateCw,
  Sun,
  ZoomIn,
  ZoomOut,
  Check,
  ArrowRight,
  RefreshCw,
  Sliders,
  Image as ImageIcon,
  Scan,
  Layers,
  Save,
  AlertCircle,
  Tag,
  Barcode,
  FolderTree,
  Eye,
  SwitchCamera
} from 'lucide-react';
import { Product, Category } from '../../types';
import { processProductImage, StudioProcessOptions } from '../../utils/imageStudioProcessor';

interface ProductStudioModalProps {
  product: Product;
  categories: Category[];
  allProductsList?: Product[];
  onClose: () => void;
  onSave: (updatedProduct: Product, andOpenNextUnimaged?: boolean) => Promise<void>;
}

export const ProductStudioModal: React.FC<ProductStudioModalProps> = ({
  product,
  categories,
  allProductsList = [],
  onClose,
  onSave,
}) => {
  // Form fields
  const [nameUz, setNameUz] = useState(product.nameUz || '');
  const [nameRu, setNameRu] = useState(product.nameRu || '');
  const [brand, setBrand] = useState(product.brand || '');
  const [barcode, setBarcode] = useState(product.barcode || '');
  const [categoryId, setCategoryId] = useState(product.categoryId || 'cat_grocery');

  // Image source states
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'url'>('upload');
  const [rawImageSource, setRawImageSource] = useState<string | File | null>(product.image || product.imageUrl || null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>(product.image || product.imageUrl || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Montage adjustment options
  const [bgMode, setBgMode] = useState<'studio_white' | 'soft_gradient' | 'warm_studio' | 'original'>('studio_white');
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [brightness, setBrightness] = useState<number>(2);
  const [contrast, setContrast] = useState<number>(8);
  const [saturation, setSaturation] = useState<number>(6);
  const [groundShadow, setGroundShadow] = useState<boolean>(true);
  const [paddingPercent, setPaddingPercent] = useState<number>(10);
  const [showAdvancedSliders, setShowAdvancedSliders] = useState<boolean>(false);

  // Camera states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Run auto montage whenever raw image source or montage parameters change
  useEffect(() => {
    if (!rawImageSource) return;

    let isMounted = true;
    const runMontage = async () => {
      try {
        setIsProcessing(true);
        setErrorMsg(null);

        const options: StudioProcessOptions = {
          backgroundMode: bgMode,
          rotation,
          zoom,
          brightness,
          contrast,
          saturation,
          addGroundShadow: groundShadow,
          paddingPercent,
          outputSize: 800,
          quality: 0.90,
        };

        const result = await processProductImage(rawImageSource, options);
        if (isMounted) {
          setProcessedImageUrl(result.dataUrl);
        }
      } catch (err: any) {
        console.error('Image montage error:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Rasmni montaj qilishda xatolik yuz berdi');
        }
      } finally {
        if (isMounted) setIsProcessing(false);
      }
    };

    runMontage();

    return () => {
      isMounted = false;
    };
  }, [rawImageSource, bgMode, rotation, zoom, brightness, contrast, saturation, groundShadow, paddingPercent]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Kameraga ulanib bo‘lmadi. Iltimos brauzerda kamera ruxsatini yoqing.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const snapDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    stopCamera();
    setRawImageSource(snapDataUrl);
    // Reset rotations / zoom to clean state
    setRotation(0);
    setZoom(1.0);
    setActiveTab('upload');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawImageSource(file);
      setRotation(0);
      setZoom(1.0);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setRawImageSource(urlInput.trim());
    setUrlInput('');
  };

  const handleAutoEnhanceReset = () => {
    setBgMode('studio_white');
    setRotation(0);
    setZoom(1.0);
    setBrightness(2);
    setContrast(8);
    setSaturation(6);
    setGroundShadow(true);
    setPaddingPercent(10);
  };

  const handleSaveProduct = async (andNext: boolean = false) => {
    if (!nameUz.trim()) {
      setErrorMsg("Mahsulot o'zbekcha nomini kiritish majburiy!");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const updated: Product = {
        ...product,
        nameUz: nameUz.trim(),
        nameRu: nameRu.trim() || nameUz.trim(),
        brand: brand.trim(),
        barcode: barcode.trim(),
        categoryId,
        image: processedImageUrl || '',
        imageUrl: processedImageUrl || '',
        imageVerificationStatus: processedImageUrl ? 'verified' : 'unverified',
      };

      await onSave(updated, andNext);
    } catch (err: any) {
      console.error('Save product error:', err);
      setErrorMsg(err.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 relative">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Mahsulot Studiyasi: Nom & Rasm
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Avto-Montaj
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Shtrix-kod: <span className="font-mono text-slate-300 font-bold">{product.barcode || 'Mavjud emas'}</span> | ID: {product.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            title="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Image Capture & Studio Montage (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Capture Source Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>📁 Fayl / Galereya</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  startCamera();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'camera'
                    ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>📸 Jonli Kamera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab('url');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'url'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Link className="w-4 h-4" />
                <span>🔗 Havola (URL)</span>
              </button>
            </div>

            {/* LIVE CAMERA VIEW */}
            {activeTab === 'camera' && (
              <div className="relative bg-black rounded-3xl overflow-hidden aspect-square border border-slate-800 flex flex-col items-center justify-center shadow-inner">
                {cameraError ? (
                  <div className="text-center p-6 space-y-3">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
                    <button
                      onClick={() => startCamera()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                    >
                      Qayta urinish
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Camera Guide Frame */}
                    <div className="absolute inset-8 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                      <span className="bg-slate-950/70 text-amber-300 text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur">
                        Tovarni markazga joylashtiring
                      </span>
                    </div>

                    {/* Camera Action Buttons */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4 z-10">
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center shadow-lg"
                        title="Kamerani almashtirish (Old/Orqa)"
                      >
                        <SwitchCamera className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={capturePhotoFromCamera}
                        className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 border-4 border-white/80 flex items-center justify-center shadow-2xl transition-all font-bold"
                        title="Rasmga olish"
                      >
                        <Camera className="w-8 h-8" />
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shadow-lg"
                        title="Bekor qilish"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* URL INPUT VIEW */}
            {activeTab === 'url' && (
              <form onSubmit={handleUrlSubmit} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Rasm to'g'ridan-to'g'ri havolasi (URL):</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/product-image.jpg"
                    className="flex-1 bg-slate-900 text-xs text-white px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md"
                  >
                    Yuklash
                  </button>
                </div>
              </form>
            )}

            {/* STUDIO LIVE CANVAS PREVIEW */}
            {activeTab !== 'camera' && (
              <div className="relative bg-slate-950 rounded-3xl border border-slate-800 p-3 flex flex-col items-center justify-center shadow-xl">
                
                {/* Visual Canvas Frame (1:1 aspect ratio) */}
                <div className="w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden relative shadow-2xl flex items-center justify-center bg-slate-900 border border-slate-800">
                  {processedImageUrl ? (
                    <img
                      src={processedImageUrl}
                      alt="Montaj qilingan mahsulot"
                      className="w-full h-full object-contain transition-all"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-2">
                      <ImageIcon className="w-12 h-12 stroke-[1.5] text-slate-600" />
                      <p className="text-xs font-medium text-slate-400">
                        Mahsulot rasmi yo'q. Fayl yuklang yoki kameradan oling.
                      </p>
                    </div>
                  )}

                  {/* Processing spinner overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-amber-400 gap-2 z-10">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-bold">Studio Montaj...</span>
                    </div>
                  )}

                  {/* Badge */}
                  {processedImageUrl && (
                    <div className="absolute top-2.5 left-2.5 bg-emerald-500/90 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur shadow-md flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>1:1 Studio Montaj</span>
                    </div>
                  )}
                </div>

                {/* File Drop & Browse trigger */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="w-full flex items-center justify-between gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rasmni yangilash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 border border-slate-700"
                    title="90 gradus burish"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                    <span>{rotation}°</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoEnhanceReset}
                    className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1 border border-amber-500/30"
                    title="Avtomatik ideal parametrlarni tiklash"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>
            )}

            {/* STUDIO QUICK CONTROLS */}
            {activeTab !== 'camera' && processedImageUrl && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Studio Foni va Montaj:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSliders(!showAdvancedSliders)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showAdvancedSliders ? 'Yashirish' : 'Sozlamalar'}</span>
                  </button>
                </div>

                {/* Background Styles Selector */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setBgMode('studio_white')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold text-center border transition-all ${
                      bgMode === 'studio_white'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    🌟 Studio Oq
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgMode('soft_gradient')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold text-center border transition-all ${
                      bgMode === 'soft_gradient'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    🎨 Gradient
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgMode('warm_studio')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold text-center border transition-all ${
                      bgMode === 'warm_studio'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ☕ Iliq Fon
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgMode('original')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold text-center border transition-all ${
                      bgMode === 'original'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ⬜ Toza Oq
                  </button>
                </div>

                {/* Advanced Sliders */}
                {showAdvancedSliders && (
                  <div className="pt-2 space-y-2.5 border-t border-slate-800 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400 flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" /> Kattalashtirish:
                      </span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-36 accent-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5" /> Yorug'lik / Kontrast:
                      </span>
                      <input
                        type="range"
                        min="-20"
                        max="30"
                        step="2"
                        value={contrast}
                        onChange={(e) => setContrast(parseInt(e.target.value))}
                        className="w-36 accent-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tabiiy Studio Soya:</span>
                      <button
                        type="button"
                        onClick={() => setGroundShadow(!groundShadow)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          groundShadow ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {groundShadow ? 'Yoqilgan' : "O'chirilgan"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Product Identity & Names Editor (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 bg-slate-950/60 p-4 sm:p-5 rounded-3xl border border-slate-800">
            <div className="space-y-4">
              
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sky-400" />
                  Mahsulot Nomi va Ma'lumotlari
                </h3>
                <p className="text-xs text-slate-400">
                  Kiritilgan o'zgarishlar darhol bazada va Telegram botda yangilanadi.
                </p>
              </div>

              {/* Error Box */}
              {errorMsg && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name Uz */}
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  Mahsulot Nomi (O'zbekcha) *
                </label>
                <input
                  type="text"
                  required
                  value={nameUz}
                  onChange={(e) => setNameUz(e.target.value)}
                  placeholder="Masalan: Coca-Cola 1.5L Gazlangan Ichimlik"
                  className="w-full bg-slate-900 text-white font-medium text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>

              {/* Name Ru */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mahsulot Nomi (Ruscha)
                </label>
                <input
                  type="text"
                  value={nameRu}
                  onChange={(e) => setNameRu(e.target.value)}
                  placeholder="Например: Напиток газированный Coca-Cola 1.5л"
                  className="w-full bg-slate-900 text-white font-medium text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-400 transition-all"
                />
              </div>

              {/* Brand & Barcode Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Brend / Ishlab chiqaruvchi
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Coca-Cola, Nestle..."
                    className="w-full bg-slate-900 text-white font-medium text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Shtrix-kod (Barcode)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="47800..."
                      className="w-full bg-slate-900 text-white font-mono font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
                  Kategoriya
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameUz} ({c.nameRu})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price / Unit Reference Info */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Chakana Narx:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {product.price ? product.price.toLocaleString() : '0'} so'm
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">O'lchov birligi:</span>
                  <span className="font-bold text-slate-200 uppercase">{product.unit || 'dona'}</span>
                </div>
              </div>

            </div>

            {/* Action Buttons: Save & Save + Next */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveProduct(false)}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>💾 O'zgarishlarni Saqlash</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveProduct(true)}
                className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all disabled:opacity-50"
              >
                <span>⚡️ Saqlash va Keyingi Rasmsiz Tovarga O'tish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
