
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash, ShoppingCart, Upload, Search, AlertCircle, FileSpreadsheet, Calendar, Download, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { ToastType } from './Toast';
import * as XLSX from 'xlsx';

interface TransactionsProps {
  items: InventoryItem[];
  user: User;
  onSuccess: () => void;
  notify: (msg: string, type: ToastType) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ items, user, onSuccess, notify }) => {
  const [type, setType] = useState<'inbound' | 'outbound'>('outbound');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [qty, setQty] = useState<number | ''>('');
  const [selectedUOM, setSelectedUOM] = useState(''); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));

  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [documentImage, setDocumentImage] = useState<string | null>(null);

  const selectedItemData = items.find(i => i.id === selectedItemId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = items.filter(i => 
    i.active && (
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(itemSearch.toLowerCase())
    )
  );

  const getConversionFactor = (item: InventoryItem, uom: string) => {
      if (uom === item.unit) return 1;
      if (item.unit2 && uom === item.unit2 && item.ratio2) {
          return item.op2 === 'divide' ? (1 / item.ratio2) : item.ratio2;
      }
      if (item.unit3 && uom === item.unit3 && item.ratio3) {
           return item.op3 === 'divide' ? (1 / item.ratio3) : item.ratio3;
      }
      if (item.conversionUnit && uom === item.conversionUnit && item.conversionRatio) {
          return item.conversionRatio;
      }
      return 1;
  };

  const conversionRatio = selectedItemData ? getConversionFactor(selectedItemData, selectedUOM) : 1;
  const currentQty = qty === '' ? 0 : qty;
  const actualQtyToDeduct = currentQty * conversionRatio;
  const isStockInsufficient = type === 'outbound' && selectedItemData && actualQtyToDeduct > selectedItemData.stock;

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItemId(item.id);
      setItemSearch(item.name);
      setSelectedUOM(item.unit);
      setShowDropdown(false);
      // UX: Focus to Qty input after selection
      setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  // Keyboard Navigation: Search Input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        // If items are filtered and user hits enter, select the first one
        if (filteredItems.length > 0) {
            handleSelectItem(filteredItems[0]);
        }
    }
  };

  // Keyboard Navigation: Qty Input
  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          addToCart();
      }
  };

  const addToCart = () => {
    try {
      if (!selectedItemData || qty === '' || qty <= 0) return;
      if (isStockInsufficient) {
        notify("Insufficient stock for transaction", 'error');
        return;
      }
      
      const unitPrice = selectedItemData.price * conversionRatio;
      const existingIndex = cart.findIndex(c => c.itemId === selectedItemId && c.uom === selectedUOM);
      
      if (existingIndex >= 0) {
        const updatedCart = [...cart];
        const existingItem = updatedCart[existingIndex];
        const newQty = existingItem.qty + actualQtyToDeduct;
        updatedCart[existingIndex] = {
            ...existingItem,
            qty: newQty,
            total: newQty * (unitPrice / conversionRatio)
        };
        setCart(updatedCart);
      } else {
        setCart([...cart, {
          itemId: selectedItemData.id,
          sku: selectedItemData.sku,
          name: selectedItemData.name,
          qty: actualQtyToDeduct,
          uom: selectedUOM,
          unitPrice: unitPrice,
          total: currentQty * unitPrice
        }]);
      }
      setQty('');
      setSelectedItemId('');
      setItemSearch('');
      setSelectedUOM('');
      notify('Item added to batch', 'info');
      
      // UX: Return focus to search for rapid entry
      setTimeout(() => searchInputRef.current?.focus(), 100);

    } catch (e) {
      notify("Failed to add item", 'error');
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        notify("File too large. Max 2MB", 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadTemplate = () => {
      const template = [
          { SKU: 'NEW-001', Name: 'Auto Created Item', Qty: 50, Price: 50000, Unit: 'Pcs', Category: 'General' },
          { SKU: 'ELEC-001', Qty: 10 }
      ];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "Nexus_Import_Template.xlsx");
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];
          const newItemsToCreate: InventoryItem[] = [];
          const cartItemsToAdd: TransactionItem[] = [];
          let createdCount = 0;

          for (const row of data) {
              const sku = String(row.SKU || '').trim();
              const qty = Number(row.Qty || 0);
              if (!sku || qty <= 0) continue;
              
              let item = items.find(i => i.sku === sku) || newItemsToCreate.find(i => i.sku === sku);
              if (!item) {
                  item = {
                      id: crypto.randomUUID(),
                      sku: sku,
                      name: String(row.Name || 'Imported Item'),
                      category: String(row.Category || 'General'),
                      price: Number(row.Price) || 0,
                      location: String(row.Location || 'Unassigned'),
                      unit: String(row.Unit || 'Pcs'),
                      stock: 0,
                      minLevel: 5,
                      active: true
                  };
                  newItemsToCreate.push(item);
                  createdCount++;
              }
              if (item) {
                  cartItemsToAdd.push({
                      itemId: item.id, sku: item.sku, name: item.name, qty: qty, uom: item.unit, unitPrice: item.price, total: qty * item.price
                  });
              }
          }
          if (newItemsToCreate.length > 0) {
              for (const newItem of newItemsToCreate) {
                  await storageService.saveItem(newItem);
              }
              onSuccess();
          }
          if (cartItemsToAdd.length > 0) {
              setCart(prev => [...prev, ...cartItemsToAdd]);
              notify(`${cartItemsToAdd.length} items added. ${createdCount} created.`, 'success');
          } else {
              notify("No valid items found", 'warning');
          }
        } catch (e) {
            notify("Import failed. Check file format.", 'error');
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (type === 'outbound') {
        const totals: {[id: string]: number} = {};
        cart.forEach(c => { totals[c.itemId] = (totals[c.itemId] || 0) + c.qty; });
        for (const [id, totalQty] of Object.entries(totals)) {
            const dbItem = items.find(i => i.id === id);
            if (dbItem && totalQty > dbItem.stock) {
                 notify(`Insufficient stock for ${dbItem.name}`, 'error');
                 return;
            }
        }
    }
    const transaction: Transaction = {
      id: storageService.generateTransactionId(),
      type,
      date: new Date(customDate).toISOString(),
      items: cart,
      totalValue: cart.reduce((acc, curr) => acc + curr.total, 0),
      userId: user.id,
      supplier: type === 'inbound' ? supplier : undefined,
      poNumber: type === 'inbound' ? poNumber : undefined,
      deliveryNote: type === 'inbound' ? deliveryNote : undefined,
      documents: documentImage ? [documentImage] : []
    };
    try {
        await storageService.saveTransaction(transaction);
        onSuccess();
        setCart([]);
        setSupplier('');
        setPoNumber('');
        setDeliveryNote('');
        setDocumentImage(null);
        setCustomDate(new Date().toISOString().slice(0, 10));
        notify(`Transaction ${transaction.id} processed`, 'success');
    } catch (e) {
        notify("Failed to save transaction", 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
          
          {/* Elegant Transaction Type Toggle */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <button 
                onClick={() => { setType('inbound'); setCart([]); }}
                className={`relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 border ${type === 'inbound' ? 'bg-ice-gradient shadow-lg border-ice-300 transform -translate-y-1' : 'bg-slate-50 dark:bg-gray-700 border-transparent hover:bg-slate-100 dark:hover:bg-gray-600 text-slate-400'}`}
            >
                <div className={`p-3 rounded-full ${type === 'inbound' ? 'bg-white/40 text-slate-800 shadow-sm' : 'bg-transparent'}`}>
                    <ArrowDownCircle size={32} strokeWidth={1.5} />
                </div>
                <span className={`text-sm font-bold tracking-widest uppercase ${type === 'inbound' ? 'text-slate-800' : 'text-slate-400 dark:text-gray-400'}`}>Inbound (Masuk)</span>
            </button>

            <button 
                onClick={() => { setType('outbound'); setCart([]); }}
                className={`relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 border ${type === 'outbound' ? 'bg-ice-gradient shadow-lg border-ice-300 transform -translate-y-1' : 'bg-slate-50 dark:bg-gray-700 border-transparent hover:bg-slate-100 dark:hover:bg-gray-600 text-slate-400'}`}
            >
                <div className={`p-3 rounded-full ${type === 'outbound' ? 'bg-white/40 text-slate-800 shadow-sm' : 'bg-transparent'}`}>
                    <ArrowUpCircle size={32} strokeWidth={1.5} />
                </div>
                <span className={`text-sm font-bold tracking-widest uppercase ${type === 'outbound' ? 'text-slate-800' : 'text-slate-400 dark:text-gray-400'}`}>Outbound (Keluar)</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-ice-50/50 dark:bg-gray-700/30 rounded-2xl border border-ice-100 dark:border-gray-600">
                <Calendar className="text-slate-400" size={20} />
                <input 
                    type="date" 
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="bg-transparent font-semibold text-slate-700 dark:text-white outline-none w-full"
                />
            </div>

            {type === 'inbound' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-ice-100 dark:border-gray-700">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier Name</label>
                  <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-3 border border-ice-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-dark dark:text-white text-sm outline-none focus:ring-2 focus:ring-ice-300" placeholder="PT. Vendor..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">PO Number</label>
                  <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full p-3 border border-ice-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-dark dark:text-white text-sm outline-none focus:ring-2 focus:ring-ice-300" placeholder="PO-001..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Surat Jalan</label>
                  <input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} className="w-full p-3 border border-ice-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-dark dark:text-white text-sm outline-none focus:ring-2 focus:ring-ice-300" placeholder="SJ-001..." />
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-end z-20 relative">
              <div className="flex-1 w-full relative" ref={dropdownRef}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Search Item</label>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        ref={searchInputRef}
                        type="text"
                        className={`w-full pl-11 pr-4 py-3.5 border rounded-xl bg-white dark:bg-gray-900 text-dark dark:text-white outline-none focus:ring-2 transition-all ${isStockInsufficient ? 'border-rose-300 ring-rose-100' : 'border-ice-200 dark:border-gray-600 focus:ring-ice-300'}`}
                        value={itemSearch}
                        onChange={(e) => {
                            setItemSearch(e.target.value);
                            setShowDropdown(true);
                            setSelectedItemId(''); 
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Type item name or SKU..."
                    />
                </div>
                
                {showDropdown && itemSearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-indigo-50 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-indigo-200 dark:border-indigo-900/50 max-h-60 overflow-y-auto z-50 p-2 animate-in fade-in slide-in-from-top-2">
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className="p-3 hover:bg-white dark:hover:bg-gray-700 cursor-pointer rounded-xl flex justify-between items-center transition-all mb-1 last:mb-0 hover:shadow-sm hover:scale-[1.01]"
                                >
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">{item.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-bold ${item.stock === 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {item.stock} {item.unit}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-gray-500">Rp {item.price.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-slate-400">No items found</div>
                        )}
                    </div>
                )}
                
                {selectedItemData && (
                    <div className="mt-2 text-xs flex gap-4 pl-1">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">Selected: {selectedItemData.sku}</span>
                        <span className={`${type === 'outbound' && selectedItemData.stock < actualQtyToDeduct ? 'text-rose-600 font-bold' : 'text-slate-500 dark:text-gray-400'}`}>
                            Available: {selectedItemData.stock} {selectedItemData.unit}
                        </span>
                    </div>
                )}
              </div>
              
              <div className="w-full md:w-32">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Unit</label>
                  <select 
                      className="w-full p-3.5 border border-ice-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300"
                      value={selectedUOM}
                      onChange={(e) => setSelectedUOM(e.target.value)}
                      disabled={!selectedItemId}
                  >
                      {selectedItemData && (
                          <>
                              <option value={selectedItemData.unit}>{selectedItemData.unit}</option>
                              {selectedItemData.unit2 && <option value={selectedItemData.unit2}>{selectedItemData.unit2}</option>}
                              {!selectedItemData.unit2 && selectedItemData.conversionUnit && <option value={selectedItemData.conversionUnit}>{selectedItemData.conversionUnit}</option>}
                              {selectedItemData.unit3 && <option value={selectedItemData.unit3}>{selectedItemData.unit3}</option>}
                          </>
                      )}
                  </select>
              </div>

              <div className="w-full md:w-32">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Qty</label>
                <input 
                  ref={qtyInputRef}
                  type="number" 
                  min="0" 
                  value={qty} 
                  onChange={(e) => setQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                  onKeyDown={handleQtyKeyDown}
                  className={`w-full p-3.5 border rounded-xl bg-white dark:bg-gray-900 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300 ${isStockInsufficient ? 'border-rose-300 text-rose-600' : 'border-ice-200 dark:border-gray-600'}`}
                />
              </div>

              <button 
                onClick={addToCart}
                disabled={!selectedItemId || isStockInsufficient || qty === ''}
                className="w-full md:w-auto h-[50px] px-8 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus size={18} /> Add
              </button>
            </div>

            {isStockInsufficient && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium animate-pulse border border-rose-100 dark:border-rose-800">
                    <AlertCircle size={18} />
                    Insufficient Stock. You need {actualQtyToDeduct} {selectedItemData?.unit} but only have {selectedItemData?.stock} available.
                </div>
            )}

            <div className="flex justify-between items-center border-t border-ice-100 dark:border-gray-700 pt-6 mt-4">
                {type === 'inbound' ? (
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Upload Document (Image)</label>
                    <div className="flex gap-2 items-center">
                        <div className="relative overflow-hidden group">
                             <button className="flex items-center gap-2 text-sm text-slate-600 dark:text-ice-200 hover:bg-ice-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl border border-dashed border-ice-300 dark:border-gray-600 transition-colors">
                                 <Upload size={16} /> {documentImage ? 'Change Photo' : 'Upload Proof'}
                             </button>
                             <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        {documentImage && <span className="text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded">Image Attached</span>}
                    </div>
                </div>
                ) : <div className="flex-1"></div>}

                <div className="flex gap-3">
                     <button onClick={downloadTemplate} className="text-slate-400 hover:text-ice-600 transition-colors p-2" title="Download Template">
                         <Download size={20} />
                     </button>
                     <div className="relative">
                        <button className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-gray-300 hover:bg-ice-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl transition-colors border border-transparent hover:border-ice-200">
                            <FileSpreadsheet size={16} /> Bulk Import
                        </button>
                        <input 
                            type="file" 
                            accept=".xlsx, .csv" 
                            onChange={handleBulkImport}
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            title="Import CSV with columns: SKU, Qty, (Optional: Name, Price, Unit, Category)"
                        />
                     </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 flex flex-col h-[calc(100vh-140px)] sticky top-24 overflow-hidden">
        <div className="p-6 border-b border-ice-100 dark:border-gray-700 bg-ice-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
            <ShoppingCart size={22} className="text-ice-500" /> Batch Cart
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 border-b border-ice-100 dark:border-gray-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider backdrop-blur">
              <tr>
                <th className="p-4 pl-6">Item</th>
                <th className="p-4 text-center">Qty</th>
                <th className="p-4 text-right">Subtotal</th>
                <th className="p-4 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400 py-16 flex flex-col items-center gap-2">
                      <div className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-full"><ShoppingCart size={24} className="opacity-20"/></div>
                      <span className="text-sm font-medium">Cart is empty</span>
                  </td>
                </tr>
              ) : (
                cart.map((item, idx) => {
                    const dbItem = items.find(i => i.id === item.itemId);
                    let displayQty = item.qty;
                    const factor = dbItem ? getConversionFactor(dbItem, item.uom) : 1;
                    displayQty = item.qty / factor;

                    return (
                      <tr key={idx} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.sku}</div>
                        </td>
                        <td className="p-4 text-center text-sm dark:text-gray-300">
                            <span className="font-mono font-bold bg-slate-50 dark:bg-gray-700 px-2 py-1 rounded">{parseFloat(displayQty.toFixed(2))}</span> <span className="text-xs text-slate-500">{item.uom}</span>
                            {item.uom !== dbItem?.unit && <div className="text-[9px] text-slate-400 mt-1">({item.qty} {dbItem?.unit})</div>}
                        </td>
                        <td className="p-4 text-right text-sm font-medium dark:text-gray-200">Rp {item.total.toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => removeFromCart(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-ice-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50">
          <div className="flex justify-between mb-6">
            <span className="text-slate-500 dark:text-gray-400 font-medium">Total Value</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-white">
              Rp {cart.reduce((a, b) => a + b.total, 0).toLocaleString('id-ID')}
            </span>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={cart.length === 0}
            className="w-full py-4 bg-ice-gradient text-slate-800 font-bold rounded-xl shadow-lg shadow-ice-200/50 dark:shadow-none hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:transform-none disabled:shadow-none border border-white/20"
          >
            Process Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
