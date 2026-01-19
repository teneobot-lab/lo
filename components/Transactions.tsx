import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash, ShoppingCart, Upload, Search, AlertCircle, FileSpreadsheet, Calendar, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TransactionsProps {
  items: InventoryItem[];
  user: User;
  onSuccess: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ items, user, onSuccess }) => {
  const [type, setType] = useState<'inbound' | 'outbound'>('outbound');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  
  // Autocomplete State
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inputs - Initialized as empty strings for clean UI
  const [qty, setQty] = useState<number | ''>('');
  const [selectedUOM, setSelectedUOM] = useState(''); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));

  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [documentImage, setDocumentImage] = useState<string | null>(null);

  const selectedItemData = items.find(i => i.id === selectedItemId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items for Autocomplete
  const filteredItems = items.filter(i => 
    i.active && (
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(itemSearch.toLowerCase())
    )
  );

  // Calculate actual stock deduction based on UOM
  const conversionRatio = (selectedItemData?.conversionUnit === selectedUOM && selectedItemData?.conversionRatio) 
      ? selectedItemData.conversionRatio 
      : 1;
  
  const currentQty = qty === '' ? 0 : qty;
  const actualQtyToDeduct = currentQty * conversionRatio;

  // Real-time Stock Validation
  const isStockInsufficient = type === 'outbound' && selectedItemData && actualQtyToDeduct > selectedItemData.stock;

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItemId(item.id);
      setItemSearch(item.name);
      setSelectedUOM(item.unit); // Default to base unit
      setShowDropdown(false);
  };

  const addToCart = () => {
    if (!selectedItemData || qty === '' || qty <= 0) return;
    if (isStockInsufficient) return;
    
    // Determine Price per Unit based on selected UOM
    const unitPrice = selectedItemData.price * conversionRatio;

    // Check duplication (only if same item AND same unit)
    const existingIndex = cart.findIndex(c => c.itemId === selectedItemId && c.uom === selectedUOM);
    
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingIndex];
      const newQty = existingItem.qty + actualQtyToDeduct; // total base units
      
      updatedCart[existingIndex] = {
          ...existingItem,
          qty: newQty, // Update total base units deducted
          total: newQty * (unitPrice / conversionRatio) // Recalculate total price
      };
      setCart(updatedCart);

    } else {
      setCart([...cart, {
        itemId: selectedItemData.id,
        sku: selectedItemData.sku,
        name: selectedItemData.name,
        qty: actualQtyToDeduct, // Store actual stock impact
        uom: selectedUOM,
        unitPrice: unitPrice,
        total: currentQty * unitPrice
      }]);
    }
    setQty('');
    setSelectedItemId('');
    setItemSearch('');
    setSelectedUOM('');
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];

          const newItemsToCreate: InventoryItem[] = [];
          const cartItemsToAdd: TransactionItem[] = [];
          let createdCount = 0;

          data.forEach(row => {
              const sku = String(row.SKU || '').trim();
              const qty = Number(row.Qty || 0);
              if (!sku || qty <= 0) return;
              
              // 1. Check if item exists in current props
              // 2. ALSO check if we just created it in this loop (to avoid duplicates in one file)
              let item = items.find(i => i.sku === sku) || newItemsToCreate.find(i => i.sku === sku);

              if (!item) {
                  // AUTO CREATE NEW ITEM
                  item = {
                      id: crypto.randomUUID(),
                      sku: sku,
                      name: String(row.Name || 'Imported Item'),
                      category: String(row.Category || 'General'),
                      price: Number(row.Price) || 0,
                      location: String(row.Location || 'Unassigned'),
                      unit: String(row.Unit || 'Pcs'),
                      stock: 0, // Initial stock is 0, transaction will adjust it
                      minLevel: 5,
                      active: true
                  };
                  newItemsToCreate.push(item);
                  createdCount++;
              }

              // Add to cart payload
              if (item) {
                  cartItemsToAdd.push({
                      itemId: item.id,
                      sku: item.sku,
                      name: item.name,
                      qty: qty, // Bulk import assumes Base Unit
                      uom: item.unit,
                      unitPrice: item.price,
                      total: qty * item.price
                  });
              }
          });
          
          // Save all new items to storage
          if (newItemsToCreate.length > 0) {
              newItemsToCreate.forEach(newItem => {
                  storageService.saveItem(newItem);
              });
              // CRITICAL: Call onSuccess to refresh parent's `items` prop immediately
              // so that validation and subsequent saves work correctly.
              onSuccess();
          }

          if (cartItemsToAdd.length > 0) {
              setCart(prev => [...prev, ...cartItemsToAdd]);
              alert(`Processed import: ${cartItemsToAdd.length} items added to cart. (${createdCount} new items created automatically).`);
          } else {
              alert("No valid items found.");
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset
  };

  const handleSubmit = () => {
    if (cart.length === 0) return;

    // Final Stock Check before Submit for Outbound
    if (type === 'outbound') {
        const totals: {[id: string]: number} = {};
        cart.forEach(c => {
            totals[c.itemId] = (totals[c.itemId] || 0) + c.qty;
        });

        // We must re-fetch items here or trust props. 
        // Note: If items were auto-created during import, `onSuccess` triggered a refresh, 
        // but `items` prop might take a render cycle to update. 
        // For safety, we use the `items` prop which should be fresh if `onSuccess` was called.
        for (const [id, totalQty] of Object.entries(totals)) {
            const dbItem = items.find(i => i.id === id);
            // If item was just created, stock is 0. Outbound will fail. This is intended.
            // User must Inbound first.
            if (dbItem && totalQty > dbItem.stock) {
                 alert(`Error: Insufficient stock for ${dbItem.name}. Need: ${totalQty}, Available: ${dbItem.stock}`);
                 return;
            }
        }
    }

    const transaction: Transaction = {
      id: storageService.generateTransactionId(), // Use Auto Generator
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

    storageService.saveTransaction(transaction);
    onSuccess();
    // Reset
    setCart([]);
    setSupplier('');
    setPoNumber('');
    setDeliveryNote('');
    setDocumentImage(null);
    setCustomDate(new Date().toISOString().slice(0, 10));
    alert(`Transaction ${transaction.id} saved successfully!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Input Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 flex gap-2">
                <button 
                onClick={() => { setType('inbound'); setCart([]); }}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 'inbound' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 text-muted'}`}
                >
                INBOUND
                </button>
                <button 
                onClick={() => { setType('outbound'); setCart([]); }}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 'outbound' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 text-muted'}`}
                >
                OUTBOUND
                </button>
            </div>
            
            {/* Date Picker */}
            <div className="relative md:w-48">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={18} />
                <input 
                    type="date" 
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-dark"
                />
            </div>
          </div>

          <div className="space-y-4">
            {/* Header Data for Inbound */}
            {type === 'inbound' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Supplier Name</label>
                  <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">PO Number</label>
                  <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Surat Jalan / Ref</label>
                  <input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
            )}

            {/* Advanced Autocomplete Item Selection */}
            <div className="flex flex-col md:flex-row gap-4 items-start z-20 relative">
              <div className="flex-1 w-full relative" ref={dropdownRef}>
                <label className="block text-xs font-semibold text-muted mb-1">Search Item</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input 
                        type="text"
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${isStockInsufficient ? 'border-rose-300 ring-rose-100' : 'border-border focus:ring-primary/20'}`}
                        value={itemSearch}
                        onChange={(e) => {
                            setItemSearch(e.target.value);
                            setShowDropdown(true);
                            setSelectedItemId(''); // Clear selection on type
                        }}
                        onFocus={() => setShowDropdown(true)}
                    />
                </div>
                
                {/* Custom Dropdown List */}
                {showDropdown && itemSearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50">
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none flex justify-between items-center"
                                >
                                    <div>
                                        <p className="font-medium text-sm text-dark">{item.name}</p>
                                        <p className="text-xs text-muted">{item.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-bold ${item.stock === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                            Stock: {item.stock} {item.unit}
                                        </p>
                                        <p className="text-xs text-muted">Rp {item.price.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted">No items found</div>
                        )}
                    </div>
                )}
                
                {selectedItemData && (
                    <div className="mt-2 text-xs flex gap-4">
                        <span className="text-emerald-600 font-medium">Selected: {selectedItemData.sku}</span>
                        <span className="text-muted">Base Price: Rp {selectedItemData.price.toLocaleString()}</span>
                        <span className={`${type === 'outbound' && selectedItemData.stock < actualQtyToDeduct ? 'text-rose-600 font-bold' : 'text-muted'}`}>
                            Available Stock: {selectedItemData.stock} {selectedItemData.unit}
                        </span>
                    </div>
                )}
              </div>
              
              {/* Unit Selection (Conversion) */}
              <div className="w-full md:w-32">
                  <label className="block text-xs font-semibold text-muted mb-1">Unit</label>
                  <select 
                      className="w-full p-3 border border-border rounded-xl bg-white"
                      value={selectedUOM}
                      onChange={(e) => setSelectedUOM(e.target.value)}
                      disabled={!selectedItemId}
                  >
                      {selectedItemData && (
                          <>
                              <option value={selectedItemData.unit}>{selectedItemData.unit} (1:1)</option>
                              {selectedItemData.conversionUnit && (
                                  <option value={selectedItemData.conversionUnit}>
                                      {selectedItemData.conversionUnit} (1:{selectedItemData.conversionRatio})
                                  </option>
                              )}
                          </>
                      )}
                  </select>
              </div>

              <div className="w-full md:w-32">
                <label className="block text-xs font-semibold text-muted mb-1">Qty</label>
                <input 
                  type="number" 
                  min="0" 
                  value={qty} 
                  onChange={(e) => setQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className={`w-full p-3 border rounded-xl ${isStockInsufficient ? 'border-rose-300 text-rose-600' : 'border-border'}`}
                />
              </div>

              <button 
                onClick={addToCart}
                disabled={!selectedItemId || isStockInsufficient || qty === ''}
                className="w-full md:w-auto mt-6 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add
              </button>
            </div>

            {/* Error Message for Stock */}
            {isStockInsufficient && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium animate-pulse">
                    <AlertCircle size={18} />
                    Insufficient Stock. You need {actualQtyToDeduct} {selectedItemData?.unit} but only have {selectedItemData?.stock} available.
                </div>
            )}

            {/* Additional Actions Line */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                 {/* Document Upload for Inbound */}
                {type === 'inbound' ? (
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted mb-1">Upload Document (Image)</label>
                    <div className="flex gap-2 items-center">
                        <div className="relative overflow-hidden">
                             <button className="flex items-center gap-2 text-sm text-primary hover:bg-blue-50 px-3 py-2 rounded-lg border border-primary border-dashed">
                                 <Upload size={16} /> {documentImage ? 'Change Photo' : 'Upload Proof'}
                             </button>
                             <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        {documentImage && <span className="text-xs text-emerald-500 font-medium">Image Attached</span>}
                    </div>
                </div>
                ) : <div className="flex-1"></div>}

                {/* Bulk Import for Cart */}
                <div className="flex gap-3">
                     <button onClick={downloadTemplate} className="text-muted hover:text-primary transition-colors p-2" title="Download Template">
                         <Download size={20} />
                     </button>
                     <div className="relative">
                        <button className="flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors">
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

      {/* Right: Cart Summary */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 flex flex-col h-[calc(100vh-140px)] sticky top-24 overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50">
          <h3 className="font-bold text-dark flex items-center gap-2">
            <ShoppingCart size={20} /> Current Batch
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border text-xs font-semibold text-muted uppercase">
              <tr>
                <th className="p-3 bg-slate-50 pl-4">Item</th>
                <th className="p-3 bg-slate-50 text-center">Qty</th>
                <th className="p-3 bg-slate-50 text-right">Subtotal</th>
                <th className="p-3 bg-slate-50 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-10">Cart is empty</td>
                </tr>
              ) : (
                cart.map((item, idx) => {
                    const dbItem = items.find(i => i.id === item.itemId);
                    let displayQty = item.qty;
                    if (dbItem?.conversionUnit === item.uom && dbItem.conversionRatio) {
                        displayQty = item.qty / dbItem.conversionRatio;
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 pl-4">
                          <div className="font-medium text-sm text-dark">{item.name}</div>
                          <div className="text-xs text-muted">{item.sku}</div>
                        </td>
                        <td className="p-3 text-center text-sm">
                            {displayQty} {item.uom}
                            {item.uom !== dbItem?.unit && <div className="text-[10px] text-muted">({item.qty} {dbItem?.unit})</div>}
                        </td>
                        <td className="p-3 text-right text-sm font-medium">Rp {item.total.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => removeFromCart(idx)} className="text-rose-400 hover:text-rose-600 transition-colors">
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

        <div className="p-4 border-t border-border bg-slate-50">
          <div className="flex justify-between mb-4">
            <span className="text-muted font-medium">Total Value</span>
            <span className="text-xl font-bold text-dark">
              Rp {cart.reduce((a, b) => a + b.total, 0).toLocaleString('id-ID')}
            </span>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={cart.length === 0}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:transform-none"
          >
            Process Transaction
          </button>
        </div>
      </div>
    </div>
  );
};