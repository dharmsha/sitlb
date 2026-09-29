"use client";

import { useState, useEffect, useRef } from 'react';

export default function BillingPage() {
  const [billData, setBillData] = useState({
    shopName: 'Krishna Store',
    shopSubtitle: 'Fresh & Daily Needs',
    shopAddress: '123, Main Market, Near Temple, Vrindavan, UP 281121',
    shopPhone: '+91 98765 43210',
    shopEmail: 'krishnastore@gmail.com',
    shopGST: '09ABCDE1234F1Z5',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    invoiceNo: '',
    invoiceDate: '',
    items: [{ productName: '', quantity: 1, rate: 0, amount: 0 }],
    subtotal: 0,
    gstRate: 18,
    gstAmount: 0,
    discount: 0,
    discountType: 'amount',
    total: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    notes: 'Thank you for shopping at Krishna Store! 🙏',
    deliveryCharge: 0,
    platformFee: 0,
    handlingCharge: 0,
    convenienceFee: 0,
  });

  // ============================================================
  // 📦 INVENTORY / STOCK STATE
  // ============================================================
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [savedBills, setSavedBills] = useState([]);
  const [showInventory, setShowInventory] = useState(false);
  const inputRef = useRef(null);

  // ============================================================
  // 📦 DEFAULT PRODUCT DATABASE (with stock)
  // ============================================================
  const defaultProducts = [
    { name: 'Wheat Flour (Atta) - 5kg', rate: 180, stock: 10 },
    { name: 'Basmati Rice - 5kg', rate: 350, stock: 10 },
    { name: 'Normal Rice - 5kg', rate: 250, stock: 10 },
    { name: 'Sugar - 1kg', rate: 45, stock: 10 },
    { name: 'Salt - 1kg', rate: 20, stock: 10 },
    { name: 'Cooking Oil - 1L', rate: 160, stock: 10 },
    { name: 'Ghee - 500ml', rate: 220, stock: 10 },
    { name: 'Milk - 1L', rate: 60, stock: 10 },
    { name: 'Curd - 500ml', rate: 40, stock: 10 },
    { name: 'Paneer - 250g', rate: 80, stock: 10 },
    { name: 'Butter - 500g', rate: 180, stock: 10 },
    { name: 'Eggs - 12 pcs', rate: 90, stock: 10 },
    { name: 'Potato - 1kg', rate: 30, stock: 10 },
    { name: 'Onion - 1kg', rate: 25, stock: 10 },
    { name: 'Tomato - 1kg', rate: 40, stock: 10 },
    { name: 'Green Chilli - 250g', rate: 15, stock: 10 },
    { name: 'Coriander - 100g', rate: 10, stock: 10 },
    { name: 'Apple - 1kg', rate: 120, stock: 10 },
    { name: 'Banana - 12 pcs', rate: 60, stock: 10 },
    { name: 'Orange - 1kg', rate: 80, stock: 10 },
    { name: 'Grapes - 500g', rate: 60, stock: 10 },
    { name: 'Lemon - 10 pcs', rate: 30, stock: 10 },
    { name: 'Biscuits - 200g', rate: 30, stock: 10 },
    { name: 'Chips - 100g', rate: 20, stock: 10 },
    { name: 'Cold Drink - 500ml', rate: 40, stock: 10 },
    { name: 'Juice - 1L', rate: 80, stock: 10 },
    { name: 'Soap - 100g', rate: 35, stock: 10 },
    { name: 'Shampoo - 200ml', rate: 120, stock: 10 },
    { name: 'Toothpaste - 100g', rate: 60, stock: 10 },
    { name: 'Sanitizer - 500ml', rate: 100, stock: 10 },
    { name: 'Detergent - 1kg', rate: 80, stock: 10 },
    { name: 'Floor Cleaner - 1L', rate: 70, stock: 10 },
    { name: 'Dish Wash - 500ml', rate: 50, stock: 10 },
    { name: 'Chicken Biryani', rate: 130, stock: 10 },
    { name: 'Chicken Korma', rate: 60, stock: 10 },
    { name: 'Chicken Pakoda', rate: 100, stock: 10 },
    { name: 'Chicken Curry', rate: 120, stock: 10 },
    { name: 'Chicken Tikka', rate: 150, stock: 10 },
    { name: 'Mutton Biryani', rate: 200, stock: 10 },
    { name: 'Mutton Korma', rate: 180, stock: 10 },
    { name: 'Veg Biryani', rate: 100, stock: 10 },
    { name: 'Veg Thali', rate: 80, stock: 10 },
    { name: 'Butter Naan', rate: 30, stock: 10 },
    { name: 'Garlic Naan', rate: 35, stock: 10 },
    { name: 'Lassi', rate: 40, stock: 10 },
    { name: 'Soft Drink', rate: 30, stock: 10 },
  ];

  // ============================================================
  // 📦 INITIALIZE INVENTORY FROM LOCALSTORAGE
  // ============================================================
  useEffect(() => {
    generateNewInvoice();

    // Load saved bills
    const saved = localStorage.getItem('krishnaStoreBills');
    if (saved) setSavedBills(JSON.parse(saved));

    // Load inventory
    const savedInventory = localStorage.getItem('krishnaStoreInventory');
    if (savedInventory) {
      const parsed = JSON.parse(savedInventory);
      // If new products added in default, merge them
      if (parsed.length < defaultProducts.length) {
        const merged = defaultProducts.map(dp => {
          const existing = parsed.find(p => p.name === dp.name);
          return existing ? existing : { ...dp, addedAt: new Date().toISOString() };
        });
        setInventory(merged);
        localStorage.setItem('krishnaStoreInventory', JSON.stringify(merged));
      } else {
        setInventory(parsed);
      }
    } else {
      // First time: initialize with default stock
      const initial = defaultProducts.map(p => ({
        ...p,
        addedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }));
      setInventory(initial);
      localStorage.setItem('krishnaStoreInventory', JSON.stringify(initial));
    }
  }, []);

  // ============================================================
  // 📦 SAVE INVENTORY TO LOCALSTORAGE
  // ============================================================
  const saveInventory = (newInventory) => {
    setInventory(newInventory);
    localStorage.setItem('krishnaStoreInventory', JSON.stringify(newInventory));
  };

  const generateNewInvoice = () => {
    const date = new Date();
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);

    setBillData(prev => ({
      ...prev,
      invoiceNo: 'KS-' + timestamp + '-' + random,
      invoiceDate: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ', ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
    }));
  };

  // ============================================================
  // 📦 PRODUCT SEARCH (from inventory)
  // ============================================================
  const handleProductSearch = (searchValue) => {
    setSearchTerm(searchValue);
    if (searchValue.length > 1) {
      const filtered = inventory.filter(product =>
        product.name.toLowerCase().includes(searchValue.toLowerCase()) &&
        product.stock > 0
      );
      setSuggestions(filtered.slice(0, 8));
    } else {
      setSuggestions([]);
    }
  };

  // ============================================================
  // 📦 SELECT PRODUCT (auto stock check)
  // ============================================================
  const selectProduct = (product) => {
    const newItems = [...billData.items];
    const lastIndex = newItems.length - 1;

    // Check if already in items
    const alreadyInBill = newItems.find(i => i.productName === product.name);
    if (alreadyInBill) {
      alert(`"${product.name}" already bill mein hai! Quantity badhao.`);
      return;
    }

    newItems[lastIndex].productName = product.name;
    newItems[lastIndex].rate = product.rate;
    newItems[lastIndex].maxStock = product.stock; // store available stock

    const updatedData = { ...billData, items: newItems };
    const calculatedData = calculateTotals(updatedData);
    setBillData(calculatedData);
    setSuggestions([]);
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  // ============================================================
  // 📦 CALCULATE TOTALS
  // ============================================================
  const calculateTotals = (currentData) => {
    const updatedItems = currentData.items.map(item => ({
      ...item,
      amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0)
    }));

    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    const gstAmount = (subtotal * (parseFloat(currentData.gstRate) || 0)) / 100;

    let discountAmount = 0;
    if (currentData.discountType === 'percentage') {
      discountAmount = (subtotal * (parseFloat(currentData.discount) || 0)) / 100;
    } else {
      discountAmount = parseFloat(currentData.discount) || 0;
    }

    const total = subtotal + gstAmount - discountAmount +
      parseFloat(currentData.deliveryCharge || 0) +
      parseFloat(currentData.platformFee || 0) +
      parseFloat(currentData.handlingCharge || 0) +
      parseFloat(currentData.convenienceFee || 0);

    return {
      ...currentData,
      items: updatedItems,
      subtotal,
      gstAmount,
      discountAmount,
      total: total > 0 ? total : 0
    };
  };

  // ============================================================
  // 📦 HANDLE ITEM CHANGE (stock validation)
  // ============================================================
  const handleItemChange = (index, field, value) => {
    const newItems = [...billData.items];

    if (field === 'quantity') {
      const qty = parseInt(value) || 1;
      const item = newItems[index];
      const product = inventory.find(p => p.name === item.productName);

      if (product && qty > product.stock) {
        alert(`⚠️ Sirf ${product.stock} pcs available hain "${product.name}" ke liye!`);
        return;
      }
      newItems[index][field] = qty;
    } else if (field === 'productName') {
      // When typing product name, check stock
      const product = inventory.find(p => p.name === value);
      if (product) {
        newItems[index].maxStock = product.stock;
      }
      newItems[index][field] = value;
    } else {
      newItems[index][field] = value;
    }

    const updatedData = { ...billData, items: newItems };
    const calculatedData = calculateTotals(updatedData);
    setBillData(calculatedData);
  };

  const handleDiscountChange = (value, type) => {
    const updatedData = {
      ...billData,
      discount: parseFloat(value) || 0,
      discountType: type || billData.discountType
    };
    const calculatedData = calculateTotals(updatedData);
    setBillData(calculatedData);
  };

  const formatCurrency = (amount) => {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const addNewItem = () => {
    const updatedData = {
      ...billData,
      items: [...billData.items, { productName: '', quantity: 1, rate: 0, amount: 0 }]
    };
    setBillData(updatedData);
  };

  const removeItem = (index) => {
    if (billData.items.length > 1) {
      const newItems = billData.items.filter((_, i) => i !== index);
      const updatedData = { ...billData, items: newItems };
      const calculatedData = calculateTotals(updatedData);
      setBillData(calculatedData);
    }
  };

  // ============================================================
  // 📦 DEDUCT STOCK AFTER SALE
  // ============================================================
  const deductStock = () => {
    const newInventory = inventory.map(product => {
      const soldItem = billData.items.find(
        item => item.productName === product.name
      );
      if (soldItem) {
        const newStock = Math.max(0, product.stock - (parseInt(soldItem.quantity) || 0));
        return {
          ...product,
          stock: newStock,
          lastUpdated: new Date().toISOString(),
        };
      }
      return product;
    });
    saveInventory(newInventory);
  };

  // ============================================================
  // 📦 ADD STOCK (restock)
  // ============================================================
  const addStock = (productName, qty) => {
    const newInventory = inventory.map(product => {
      if (product.name === productName) {
        return {
          ...product,
          stock: product.stock + (parseInt(qty) || 0),
          lastUpdated: new Date().toISOString(),
        };
      }
      return product;
    });
    saveInventory(newInventory);
  };

  // ============================================================
  // 🖨️ PRINT INVOICE
  // ============================================================
  const printInvoice = () => {
    setIsPrinting(true);
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${billData.invoiceNo}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                margin: 0;
                padding: 20px;
                max-width: 400px;
                margin: 0 auto;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .separator { border-top: 1px dashed #000; margin: 10px 0; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 4px 2px; border-bottom: 1px solid #ddd; }
              th { text-align: left; }
              .footer { margin-top: 20px; text-align: center; font-size: 10px; }
              .text-small { font-size: 10px; }
              .text-xsmall { font-size: 9px; }
              .d-flex { display: flex; }
              .justify-content-between { justify-content: space-between; }
              .fw-bold { font-weight: bold; }
              .fs-5 { font-size: 1.25rem; }
              .mt-2 { margin-top: 0.5rem; }
              .mt-4 { margin-top: 1rem; }
              .pt-3 { padding-top: 0.75rem; }
              @media print {
                body { margin: 0; padding: 10px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="center">
              <h3 style="margin: 5px 0;">${billData.shopName}</h3>
              <h4 style="margin: 5px 0;">${billData.shopSubtitle}</h4>
              <p class="text-small" style="margin: 2px 0;">
                ${billData.shopAddress}
              </p>
              <p class="text-small" style="margin: 2px 0;">
                Phone: ${billData.shopPhone} | Email: ${billData.shopEmail}
              </p>
            </div>

            <div class="separator"></div>

            <div style="margin: 10px 0;">
              <div><span class="bold">Order ID:</span> ${billData.invoiceNo}</div>
              <div><span class="bold">Date:</span> ${billData.invoiceDate}</div>
            </div>

            <div style="margin: 10px 0;">
              <div class="bold">Customer Details:</div>
              <div>${billData.customerName || 'Walk-in Customer'}</div>
              ${billData.customerPhone ? `<div>${billData.customerPhone}</div>` : ''}
              ${billData.customerAddress ? `<div class="text-small">${billData.customerAddress}</div>` : ''}
            </div>

            <div class="separator"></div>

            <table>
              <thead>
                <tr>
                  <th>QTY</th>
                  <th>ITEM</th>
                  <th class="right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${billData.items.map(item => `
                  <tr>
                    <td>${item.quantity || 1}</td>
                    <td>
                      <div>${item.productName || '-'}</div>
                    </td>
                    <td class="right">${formatCurrency(item.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="separator"></div>

            <div style="margin-top: 15px;">
              <div class="d-flex justify-content-between">
                <span>Subtotal:</span>
                <span>${formatCurrency(billData.subtotal)}</span>
              </div>

              ${billData.discount > 0 ? `
                <div class="d-flex justify-content-between">
                  <span>Discount:</span>
                  <span>-${formatCurrency(billData.discountType === 'percentage' ? (billData.subtotal * billData.discount) / 100 : billData.discount)}</span>
                </div>
              ` : ''}

              ${billData.platformFee > 0 ? `
                <div class="d-flex justify-content-between">
                  <span>Platform Fee:</span>
                  <span>${formatCurrency(billData.platformFee)}</span>
                </div>
              ` : ''}

              ${billData.handlingCharge > 0 ? `
                <div class="d-flex justify-content-between">
                  <span>Handling Charge:</span>
                  <span>${formatCurrency(billData.handlingCharge)}</span>
                </div>
              ` : ''}

              ${billData.convenienceFee > 0 ? `
                <div class="d-flex justify-content-between">
                  <span>Convenience Fee:</span>
                  <span>${formatCurrency(billData.convenienceFee)}</span>
                </div>
              ` : ''}

              ${billData.deliveryCharge > 0 ? `
                <div class="d-flex justify-content-between">
                  <span>Delivery Charge:</span>
                  <span>${formatCurrency(billData.deliveryCharge)}</span>
                </div>
              ` : ''}

              <div class="d-flex justify-content-between">
                <span>GST (${billData.gstRate}%):</span>
                <span>${formatCurrency(billData.gstAmount)}</span>
              </div>

              <div class="separator"></div>

              <div class="d-flex justify-content-between fw-bold fs-5">
                <span>TOTAL:</span>
                <span>${formatCurrency(billData.total)}</span>
              </div>

              <div class="d-flex justify-content-between mt-2">
                <span>Payment Status:</span>
                <span>${billData.paymentStatus.toUpperCase()}</span>
              </div>
            </div>

            <div class="separator"></div>

            <div class="footer">
              <div class="bold">*** THANK YOU ***</div>
              <div>Visit again at ${billData.shopName}</div>
            </div>

            <div class="footer no-print" style="margin-top:20px;">
              <button onclick="window.print()" style="padding:10px 30px; background:#dc2626; color:white; border:none; border-radius:8px; font-size:14px; cursor:pointer; margin:10px;">
                🖨️ Print Invoice
              </button>
              <button onclick="window.close()" style="padding:10px 30px; background:#6b7280; color:white; border:none; border-radius:8px; font-size:14px; cursor:pointer; margin:10px;">
                ✕ Close
              </button>
            </div>
            <script>
              setTimeout(() => { window.print(); }, 500);
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
      setIsPrinting(false);
    }, 300);
  };

  // ============================================================
  // 💾 SAVE BILL (with stock deduction)
  // ============================================================
  const saveBill = () => {
    // Validate stock
    for (const item of billData.items) {
      if (!item.productName) continue;
      const product = inventory.find(p => p.name === item.productName);
      if (!product) {
        alert(`❌ "${item.productName}" inventory mein nahi hai!`);
        return;
      }
      if (item.quantity > product.stock) {
        alert(`⚠️ "${item.productName}" ka sirf ${product.stock} pcs stock hai!`);
        return;
      }
    }

    const newBill = {
      ...billData,
      id: Date.now(),
      savedAt: new Date().toISOString(),
    };
    const updatedBills = [newBill, ...savedBills];
    setSavedBills(updatedBills);
    localStorage.setItem('krishnaStoreBills', JSON.stringify(updatedBills));

    // Deduct stock
    deductStock();

    alert('✅ Bill saved & stock updated!');
  };

  const resetBill = () => {
    if (billData.items.length > 0 && billData.total > 0) {
      if (!confirm('Save current bill before resetting?')) {
        saveBill();
      }
    }
    generateNewInvoice();
    setBillData(prev => ({
      ...prev,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ productName: '', quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0,
      gstAmount: 0,
      discount: 0,
      total: 0,
      paymentMethod: 'Cash',
      deliveryCharge: 0,
      platformFee: 0,
      handlingCharge: 0,
      convenienceFee: 0,
    }));
  };

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <span className="text-lg">🛍️</span>
              </div>
              <div>
                <span className="text-lg font-black text-slate-900">Krishna <span className="text-red-600">Store</span></span>
                <span className="block text-[10px] text-slate-400 font-medium">Billing System</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInventory(!showInventory)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                📦 Inventory
              </button>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold hidden sm:inline-block">
                📋 {billData.invoiceNo}
              </span>
              <button
                onClick={resetBill}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-200 flex items-center gap-2"
              >
                <span>➕</span> New Bill
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ============================================================ */}
        {/* 📦 INVENTORY PANEL */}
        {/* ============================================================ */}
        {showInventory && (
          <div className="mb-6 bg-white rounded-2xl border-2 border-red-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                📦 Inventory Management
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  {inventory.filter(p => p.stock > 0).length} items in stock
                </span>
              </h2>
              <button
                onClick={() => setShowInventory(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Low Stock Alert */}
            {inventory.filter(p => p.stock <= 3).length > 0 && (
              <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-600 mb-2">⚠️ Low Stock Alert (≤3 pcs):</p>
                <div className="flex flex-wrap gap-2">
                  {inventory.filter(p => p.stock <= 3).map(p => (
                    <span key={p.name} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                      {p.name} → {p.stock} pcs
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory Table */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-bold text-slate-600">Product</th>
                    <th className="text-center p-2 font-bold text-slate-600">Rate</th>
                    <th className="text-center p-2 font-bold text-slate-600">Stock</th>
                    <th className="text-center p-2 font-bold text-slate-600">Last Updated</th>
                    <th className="text-center p-2 font-bold text-slate-600">Add Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(product => (
                    <tr key={product.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 font-medium text-slate-700">{product.name}</td>
                      <td className="p-2 text-center text-slate-600">{formatCurrency(product.rate)}</td>
                      <td className="p-2 text-center">
                        <span className={`font-black px-2 py-0.5 rounded-full ${
                          product.stock === 0 ? 'bg-red-100 text-red-600' :
                          product.stock <= 3 ? 'bg-orange-100 text-orange-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {product.stock} pcs
                        </span>
                      </td>
                      <td className="p-2 text-center text-[10px] text-slate-400">
                        {product.lastUpdated ? new Date(product.lastUpdated).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-red-400"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const qty = parseInt(e.target.value);
                                if (qty > 0) {
                                  addStock(product.name, qty);
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.target.parentElement.querySelector('input');
                              const qty = parseInt(input.value);
                              if (qty > 0) {
                                addStock(product.name, qty);
                                input.value = '';
                              } else {
                                alert('Quantity daalo!');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-[10px] font-bold"
                          >
                            ➕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 mt-3 text-center">
              💡 Tip: Stock add karne ke liye quantity daalo aur Enter dabao ya ➕ button click karo
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* MAIN PANEL */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Items</p>
                <p className="text-lg font-black text-slate-800">{billData.items.length}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Subtotal</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(billData.subtotal)}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">GST</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(billData.gstAmount)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 rounded-xl shadow-lg shadow-red-200">
                <p className="text-[9px] text-red-200 font-bold uppercase tracking-wider">Total</p>
                <p className="text-lg font-black text-white">{formatCurrency(billData.total)}</p>
              </div>
            </div>

            {/* Customer */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-xs">👤</span>
                Customer Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Customer Name"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl transition-all outline-none text-sm font-medium text-slate-700"
                  value={billData.customerName}
                  onChange={(e) => setBillData({...billData, customerName: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl transition-all outline-none text-sm font-medium text-slate-700"
                  value={billData.customerPhone}
                  onChange={(e) => setBillData({...billData, customerPhone: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Address"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl transition-all outline-none text-sm font-medium text-slate-700"
                  value={billData.customerAddress}
                  onChange={(e) => setBillData({...billData, customerAddress: e.target.value})}
                />
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <span className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-xs">📦</span>
                  Items
                </h3>
                <button
                  onClick={addNewItem}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span>➕</span> Add Item
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search products... (stock automatically check hoga)"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => handleProductSearch(e.target.value)}
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-xl z-20 max-h-56 overflow-y-auto">
                    {suggestions.map((product, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 hover:bg-red-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-all"
                        onClick={() => selectProduct(product)}
                      >
                        <div>
                          <span className="font-medium text-slate-800 text-sm">{product.name}</span>
                          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            product.stock <= 3 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {product.stock} pcs left
                          </span>
                        </div>
                        <span className="text-red-600 font-bold text-sm">{formatCurrency(product.rate)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {billData.items.map((item, index) => {
                  const product = inventory.find(p => p.name === item.productName);
                  const availableStock = product ? product.stock : null;

                  return (
                    <div key={index} className="group bg-slate-50 hover:bg-white border-2 border-slate-200 hover:border-red-200 rounded-xl p-2.5 transition-all">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Product name"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-red-400 text-sm font-medium text-slate-700 transition-all"
                            value={item.productName}
                            onChange={(e) => {
                              handleItemChange(index, 'productName', e.target.value);
                              handleProductSearch(e.target.value);
                            }}
                          />
                          {availableStock !== null && (
                            <p className={`text-[9px] mt-0.5 font-bold ${
                              availableStock <= 3 ? 'text-orange-500' : 'text-green-600'
                            }`}>
                              📦 Stock: {availableStock} pcs
                            </p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            max={availableStock || 999}
                            className={`w-full px-2.5 py-1.5 bg-white border rounded-lg outline-none focus:border-red-400 text-center text-sm font-bold transition-all ${
                              availableStock !== null && item.quantity > availableStock
                                ? 'border-red-400 text-red-600'
                                : 'border-slate-200 text-slate-700'
                            }`}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Rate"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-red-400 text-center text-sm font-bold text-slate-700 transition-all"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2 text-right font-bold text-red-600 text-sm">
                          {formatCurrency(item.amount)}
                        </div>
                        <div className="col-span-1 text-right">
                          {billData.items.length > 1 && (
                            <button
                              onClick={() => removeItem(index)}
                              className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-red-500 hover:text-white text-slate-400 transition-all text-xs flex items-center justify-center"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-24">
              {/* Invoice Info */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Invoice #</p>
                  <p className="text-xs font-black text-slate-800">{billData.invoiceNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                  <p className="text-xs font-bold text-slate-700">{billData.invoiceDate}</p>
                </div>
              </div>

              {/* Extra Charges */}
              <div className="mb-3">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Extra Charges</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    placeholder="Delivery"
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-400 text-xs text-center"
                    value={billData.deliveryCharge}
                    onChange={(e) => {
                      const updatedData = { ...billData, deliveryCharge: parseFloat(e.target.value) || 0 };
                      setBillData(calculateTotals(updatedData));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Platform"
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-400 text-xs text-center"
                    value={billData.platformFee}
                    onChange={(e) => {
                      const updatedData = { ...billData, platformFee: parseFloat(e.target.value) || 0 };
                      setBillData(calculateTotals(updatedData));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Handling"
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-400 text-xs text-center"
                    value={billData.handlingCharge}
                    onChange={(e) => {
                      const updatedData = { ...billData, handlingCharge: parseFloat(e.target.value) || 0 };
                      setBillData(calculateTotals(updatedData));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Convenience"
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-400 text-xs text-center"
                    value={billData.convenienceFee}
                    onChange={(e) => {
                      const updatedData = { ...billData, convenienceFee: parseFloat(e.target.value) || 0 };
                      setBillData(calculateTotals(updatedData));
                    }}
                  />
                </div>
              </div>

              {/* Discount */}
              <div className="mb-3">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Discount</p>
                <div className="flex gap-1.5 mb-1.5">
                  <button
                    onClick={() => handleDiscountChange(billData.discount, 'amount')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold transition-all ${
                      billData.discountType === 'amount'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    ₹ Fixed
                  </button>
                  <button
                    onClick={() => handleDiscountChange(billData.discount, 'percentage')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold transition-all ${
                      billData.discountType === 'percentage'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    %
                  </button>
                </div>
                <input
                  type="number"
                  placeholder={billData.discountType === 'percentage' ? "Discount %" : "Discount Amount"}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none transition-all text-center font-bold text-sm text-slate-700"
                  value={billData.discount}
                  onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* GST */}
              <div className="mb-3">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">GST Rate</p>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 5, 12, 18, 28].map(rate => (
                    <button
                      key={rate}
                      onClick={() => {
                        const updatedData = { ...billData, gstRate: rate };
                        setBillData(calculateTotals(updatedData));
                      }}
                      className={`py-1 rounded-lg text-[9px] font-bold transition-all ${
                        billData.gstRate === rate
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="mb-3">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Payment</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(method => (
                    <button
                      key={method}
                      onClick={() => setBillData({...billData, paymentMethod: method})}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all ${
                        billData.paymentMethod === method
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-3 border-2 border-red-200 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">TOTAL</span>
                  <span className="text-2xl font-black text-red-600">{formatCurrency(billData.total)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                  <span>Subtotal: {formatCurrency(billData.subtotal)}</span>
                  <span>GST: {formatCurrency(billData.gstAmount)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-1.5">
                <button
                  onClick={printInvoice}
                  disabled={isPrinting}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  🖨️ Print Invoice
                </button>
                <button
                  onClick={saveBill}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  💾 Save Bill (Stock Auto Deduct)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-slate-400 font-bold tracking-wider">
              © 2026 Krishna Store - Billing System
            </p>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>🛍️ {billData.items.length} items</span>
              <span>📋 {billData.invoiceNo}</span>
              <span>💳 {billData.paymentMethod}</span>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}