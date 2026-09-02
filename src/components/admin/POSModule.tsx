import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  DollarSign,
  CheckCircle,
  X,
  User,
} from 'lucide-react';
import { Product, POSReceipt, PaymentMethod } from '../../types';
import { fetchProducts, fetchProductByBarcode, posCheckout } from '../../services/api';
import { getAutoProductImage } from '../../utils/productUtils';
import { ProductThumbnail } from '../common/ProductThumbnail';
import { matchProductSearch, filterProductsSmart } from '../../utils/searchUtils';

export const POSModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(100000);
  const [lastReceipt, setLastReceipt] = useState<POSReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts().then((p) => setProducts(p));
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const cleanInput = barcodeInput.trim();
    let matched = products.find(
      (p) =>
        p.barcode === cleanInput ||
        p.barcodes?.some((b) => b === cleanInput) ||
        p.sku?.toLowerCase() === cleanInput.toLowerCase()
    );
    
    if (!matched) {
      // Instant O(1) server-side DB B-tree lookup for fast scanning with 50,000+ items
      const serverProduct = await fetchProductByBarcode(cleanInput);
      if (serverProduct) {
        matched = serverProduct;
        setProducts((prev) => [serverProduct, ...prev.filter((p) => p.id !== serverProduct.id)]);
      }
    }

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`Shtrix-kod (${cleanInput}) bo'yicha mahsulot topilmadi!`);
    }
  };

  const isFractionalProduct = (productOrUnit?: Product | string | null): boolean => {
    if (!productOrUnit) return false;
    const unit = typeof productOrUnit === 'string' ? productOrUnit : productOrUnit.unit;
    if (!unit) return false;
    const u = unit.toLowerCase().trim();
    if (u === 'dona' || u === 'шт' || u === 'sht' || u === 'pachka' || u === 'quti' || u === 'kor' || u === 'korobka' || u === 'blok' || u === 'ta') {
      return false;
    }
    return true;
  };

  const getProductMinQty = (productOrUnit?: Product | string | null): number => {
    if (isFractionalProduct(productOrUnit)) {
      return 0.1;
    }
    if (productOrUnit && typeof productOrUnit === 'object' && productOrUnit.minQuantity && productOrUnit.minQuantity >= 1) {
      return productOrUnit.minQuantity;
    }
    return 1;
  };

  const addToCart = (product: Product, customQty?: number) => {
    const isFract = isFractionalProduct(product);
    const minQ = getProductMinQty(product);
    const step = isFract ? 0.1 : 1;
    const initialQty = customQty !== undefined ? Math.max(minQ, customQty) : minQ;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => {
          if (item.product.id === product.id) {
            const added = customQty !== undefined ? customQty : step;
            const updated = Math.round((item.quantity + added) * 1000) / 1000;
            return { ...item, quantity: updated };
          }
          return item;
        });
      }
      return [...prev, { product, quantity: Math.round(initialQty * 1000) / 1000 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const minQ = getProductMinQty(item.product);
            const currentQty = Math.round(item.quantity * 1000) / 1000;
            if (delta < 0 && currentQty <= minQ + 0.001) {
              return null;
            }
            const newQty = Math.round((currentQty + delta) * 1000) / 1000;
            if (newQty < minQ - 0.001) {
              return null;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: Product; quantity: number }>
    );
  };

  const cartTotal = cart.reduce(
    (acc, item) => acc + (item.product.discountPrice || item.product.price) * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const items = cart.map((c) => ({
      productId: c.product.id,
      productName: c.product.nameUz,
      barcode: c.product.barcode,
      quantity: c.quantity,
      unitPrice: c.product.discountPrice || c.product.price,
      totalPrice: (c.product.discountPrice || c.product.price) * c.quantity,
      image: c.product.image,
    }));

    const receipt = await posCheckout({
      branchId: 'br_toshkent_main',
      cashierName: 'Kassir Shohruh',
      items,
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? cashReceived : cartTotal,
    });

    setLastReceipt(receipt);
    setIsReceiptModalOpen(true);
    setCart([]);
  };

  const deferredSearch = React.useDeferredValue(searchQuery);

  const filteredProducts = React.useMemo(() => {
    if (!deferredSearch.trim()) {
      return products.slice(0, 36);
    }
    return filterProductsSmart(products, deferredSearch).slice(0, 36);
  }, [products, deferredSearch]);

  return (
    <div className="h-[85vh] flex gap-6">
      {/* Left - Product Selector & Barcode Scanner */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl">
        {/* Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="w-5 h-5 absolute left-3 top-3 text-sky-400" />
            <input
              type="text"
              placeholder="Shtrix-kodni skanerlang yoki kiriting (Masalan: 5449000000996)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full bg-slate-950 text-sm text-slate-100 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 font-mono"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-sky-500/20"
          >
            Skanerlash
          </button>
        </form>

        {/* Text Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Nomi bo'yicha tezkor qidiruv..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 text-xs text-slate-100 pl-9 pr-3 py-2 rounded-xl border border-slate-800"
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pr-1">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500 p-2.5 rounded-2xl text-left transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-full h-20 rounded-xl mb-2 bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                  <ProductThumbnail product={p} iconSize="w-8 h-8" />
                </div>
                <h4 className="text-xs font-semibold text-slate-100 line-clamp-1">{p.nameUz}</h4>
                <p className="text-[10px] text-slate-400 font-mono">{p.barcode}</p>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-700/50 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">
                  {(p.discountPrice || p.price).toLocaleString()} UZS
                </span>
                <span className="text-[10px] bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  +{p.unit}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right - POS Cart & Thermal Checkout Panel */}
      <div className="w-96 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-100">POS Kassa #1</h3>
              <p className="text-[11px] text-slate-400">Kassir: Shohruh • Toshkent Central</p>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 font-mono px-2 py-1 rounded border border-emerald-500/20">
              OPEN
            </span>
          </div>

          {/* Cart Items List */}
          <div className="h-64 overflow-y-auto space-y-2 pr-1">
            {cart.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-12">Shtrix-kod skanerlang yoki mahsulot tanlang</p>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <div className="min-w-0 flex-1 pr-2">
                      <h5 className="font-semibold text-slate-200 truncate">{item.product.nameUz}</h5>
                      <p className="text-[10px] text-emerald-400">
                        {((item.product.discountPrice || item.product.price) * item.quantity).toLocaleString()} UZS
                        {isFractionalProduct(item.product) && (
                          <span className="text-slate-400 ml-1">
                            ({item.quantity} {item.product.unit || 'kg'})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => updateCartQty(item.product.id, isFractionalProduct(item.product) ? -0.1 : -1)}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                        title={isFractionalProduct(item.product) ? '-100 gr' : '-1 ta'}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-slate-100 min-w-[36px] text-center font-mono text-[11px]">
                        {isFractionalProduct(item.product)
                          ? `${item.quantity} ${item.product.unit || 'kg'}`
                          : item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.product.id, isFractionalProduct(item.product) ? 0.1 : 1)}
                        className="text-slate-400 hover:text-emerald-400 p-0.5"
                        title={isFractionalProduct(item.product) ? '+100 gr' : '+1 ta'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quick gram presets for fractional items in POS */}
                  {isFractionalProduct(item.product) && (
                    <div className="flex items-center gap-1 pt-0.5">
                      {[
                        { label: '100g', val: 0.1 },
                        { label: '250g', val: 0.25 },
                        { label: '500g', val: 0.5 },
                        { label: '1kg', val: 1.0 },
                        { label: '2kg', val: 2.0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setCart((prev) =>
                              prev.map((it) => (it.product.id === item.product.id ? { ...it, quantity: preset.val } : it))
                            );
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                            Math.abs(item.quantity - preset.val) < 0.001
                              ? 'bg-sky-500 text-slate-950 font-black'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Area */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {['cash', 'terminal', 'click', 'payme'].map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m as PaymentMethod)}
                className={`p-2 rounded-xl font-semibold border capitalize transition-all ${
                  paymentMethod === m
                    ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400">Berilgan naqd pul:</span>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(Number(e.target.value))}
                className="w-24 bg-slate-900 text-right text-slate-100 px-2 py-1 rounded border border-slate-700 font-mono text-xs"
              />
            </div>
          )}

          <div className="space-y-1 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Jami:</span>
              <span className="font-bold text-slate-100">{cartTotal.toLocaleString()} UZS</span>
            </div>
            {paymentMethod === 'cash' && (
              <div className="flex justify-between text-amber-400 font-mono">
                <span>Qaytim (Change):</span>
                <span>{Math.max(0, cashReceived - cartTotal).toLocaleString()} UZS</span>
              </div>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Chek Chop Etish & Yopish ({cartTotal.toLocaleString()} UZS)</span>
          </button>
        </div>
      </div>

      {/* POS Thermal Receipt Modal */}
      {isReceiptModalOpen && lastReceipt && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-950 font-mono text-xs p-6 rounded-2xl w-80 shadow-2xl space-y-3">
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
              <h3 className="font-extrabold text-sm uppercase">TOSHKENT SUPERMARKET</h3>
              <p className="text-[10px]">Amir Temur ko'chasi 108A</p>
              <p className="text-[10px]">TEL: +998 71 200 55 55</p>
              <p className="text-[10px] font-bold">CHEK #{lastReceipt.receiptNumber}</p>
              <p className="text-[10px] text-slate-500">{new Date(lastReceipt.timestamp).toLocaleString()}</p>
            </div>

            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              {lastReceipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <div>
                    <span>{it.productName}</span>
                    <p className="text-[9px] text-slate-500">{it.quantity} x {it.unitPrice.toLocaleString()} UZS</p>
                  </div>
                  <span className="font-bold">{it.totalPrice.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              <div className="flex justify-between font-bold text-sm">
                <span>JAMI:</span>
                <span>{lastReceipt.total.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>To'lov turi:</span>
                <span className="uppercase font-bold">{lastReceipt.paymentMethod}</span>
              </div>
              {lastReceipt.changeGiven !== undefined && lastReceipt.changeGiven > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>Qaytim:</span>
                  <span>{lastReceipt.changeGiven.toLocaleString()} UZS</span>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-slate-500 pt-1 space-y-1">
              <p>Xaridingiz uchun rahmat!</p>
              <p>Telegram: @supermarket_bot</p>
            </div>

            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full bg-slate-900 text-white font-sans font-bold text-xs py-2 rounded-xl mt-2"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
