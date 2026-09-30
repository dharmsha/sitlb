"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getStats,
  getAllBills,
  getCustomers,
  deleteBill,
  groupByDate,
  groupByMonth,
  groupByYear,
  getTopProducts,
} from "@/lib/billDatabase";
import { getProducts, deleteProduct, addProduct, increaseStock } from "@/lib/productDatabase";
import {
  getAllMovements,
  getMovementsByRange,
  getDailySummary,
  getProfitSummary,
} from "@/lib/stockDatabase";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [searchBill, setSearchBill] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [detailView, setDetailView] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // 🔥 Stock movement state
  const [movements, setMovements] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any>(null);
  const [stockView, setStockView] = useState<"today" | "week" | "month" | "all">("today");
  const [stockLoading, setStockLoading] = useState(false);

  // 🔥 Profit state (NAYA)
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [profitView, setProfitView] = useState<"today" | "week" | "month" | "all">("today");
  const [profitLoading, setProfitLoading] = useState(false);

  useEffect(() => {
    loadAll();
    const refresh = () => loadAll(true);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "stock") loadStockData();
  }, [activeTab, stockView]);

  // 🔥 Load profit data
  useEffect(() => {
    if (activeTab === "profit") loadProfitData();
  }, [activeTab, profitView]);

  const loadAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [statsData, billsData, customersData, productsData, topData] =
        await Promise.all([
          getStats(),
          getAllBills(),
          getCustomers(),
          getProducts(),
          getTopProducts(),
        ]);
      setStats(statsData);
      setBills(billsData);
      setCustomers(customersData);
      setProducts(productsData);
      setTopProducts(topData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStockData = async () => {
    setStockLoading(true);
    try {
      if (stockView === "today") {
        const s = await getDailySummary();
        setStockSummary(s);
        setMovements(s.movements);
      } else {
        const now = new Date();
        let start = new Date();
        if (stockView === "week") start.setDate(now.getDate() - 7);
        else if (stockView === "month") start.setMonth(now.getMonth() - 1);
        else start = new Date(0);

        const data =
          stockView === "all"
            ? await getAllMovements()
            : await getMovementsByRange(start.getTime(), now.getTime());

        setMovements(data);
        const totalIN = data.filter((m) => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
        const totalOUT = data.filter((m) => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);
        setStockSummary({
          totalIN,
          totalOUT,
          net: totalIN - totalOUT,
          countIN: data.filter((m) => m.type === "IN").length,
          countOUT: data.filter((m) => m.type === "OUT").length,
          valueIN: data.filter((m) => m.type === "IN").reduce((s, m) => s + (m.totalValue || 0), 0),
          valueOUT: data.filter((m) => m.type === "OUT").reduce((s, m) => s + (m.totalValue || 0), 0),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStockLoading(false);
    }
  };

  // 🔥 LOAD PROFIT DATA
  const loadProfitData = async () => {
    setProfitLoading(true);
    try {
      const now = new Date();
      let start = new Date();
      if (profitView === "today") start.setHours(0, 0, 0, 0);
      else if (profitView === "week") start.setDate(now.getDate() - 7);
      else if (profitView === "month") start.setMonth(now.getMonth() - 1);
      else start = new Date(0);

      const data = await getProfitSummary(start.getTime(), now.getTime());
      setProfitSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setProfitLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    "₹" + Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });

  const formatDate = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " • " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const formatShortDate = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const formatDay = (dateObj: Date) =>
    dateObj.toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  const filteredBills = bills.filter((b) => {
    if (!searchBill) return true;
    const s = searchBill.toLowerCase();
    return (
      b.invoiceNo?.toLowerCase().includes(s) ||
      b.customerName?.toLowerCase().includes(s) ||
      b.customerPhone?.includes(s)
    );
  });

  const filteredCustomers = customers.filter((c) => {
    if (!searchCustomer) return true;
    const s = searchCustomer.toLowerCase();
    return c.name?.toLowerCase().includes(s) || c.phone?.includes(s);
  });

  const filteredProducts = products.filter((p) => {
    if (!searchProduct) return true;
    const s = searchProduct.toLowerCase();
    return p.name?.toLowerCase().includes(s) || p.barcode?.includes(s);
  });

  const handleDeleteBill = async (id: string) => {
    if (!confirm("Delete this bill permanently?")) return;
    await deleteBill(id);
    loadAll(true);
  };

  const handleDeleteProduct = async (barcode: string) => {
    if (!confirm("Delete this product permanently?")) return;
    await deleteProduct(barcode);
    loadAll(true);
    window.dispatchEvent(new Event("storage"));
  };

  // ✅ UPDATED: purchaseRate bhi save karo
  const handleSaveProduct = async (product: any) => {
    if (!product?.name || !product?.rate) {
      alert("Product name and selling rate are required.");
      return;
    }
    const finalProduct = {
      barcode: product.barcode || `GE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: String(product.name).trim(),
      purchaseRate: Number(product.purchaseRate) || 0,  // 🔥 NAYA
      rate: Number(product.rate) || 0,
      stock: Number(product.stock) || 0,
    };
    try {
      await addProduct(finalProduct);
      setShowProductModal(false);
      setEditingProduct(null);
      await loadAll(true);
      window.dispatchEvent(new Event("storage"));
      alert(`✅ Product saved: ${finalProduct.name}`);
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    }
  };

  const handleAddStock = async (barcode: string, name: string) => {
    const qtyStr = prompt(`"${name}" ke liye kitna stock add karna hai?`);
    if (!qtyStr) return;
    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      alert("Sahi number daalo!");
      return;
    }
    try {
      await increaseStock(barcode, qty);
      await loadAll(true);
      if (activeTab === "stock") loadStockData();
      window.dispatchEvent(new Event("storage"));
      alert(`✅ ${qty} stock add ho gaya!`);
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    }
  };

  const exportBillsCSV = () => {
    const csv =
      "Invoice,Date,Customer,Phone,Items,Subtotal,GST,Total,Payment\n" +
      bills.map((b: any) =>
        `${b.invoiceNo},"${formatDate(b.savedAt)}","${b.customerName || "Walk-in"}","${b.customerPhone || "-"}",${b.items?.filter((i: any) => i.productName).length || 0},${b.subtotal},${b.gstAmount},${b.total},${b.paymentMethod}`
      ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills_${Date.now()}.csv`;
    a.click();
  };

  const exportProductsCSV = () => {
    const csv =
      "Barcode,Name,PurchaseRate,SellingRate,Stock\n" +
      products.map((p: any) => `${p.barcode},"${p.name}",${p.purchaseRate || 0},${p.rate},${p.stock || 0}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${Date.now()}.csv`;
    a.click();
  };

  const exportStockCSV = () => {
    const csv =
      "Time,Type,Product,Barcode,Reason,Qty,Rate,PurchaseRate,Profit,Value,Note\n" +
      movements
        .map(
          (m: any) =>
            `"${new Date(m.createdAt).toLocaleString("en-IN")}",${m.type},"${m.productName}","${m.barcode}",${m.reason},${m.quantity},${m.rate || 0},${m.purchaseRate || 0},${m.profit || 0},${m.totalValue || 0},"${m.note || ""}"`
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock_movements_${Date.now()}.csv`;
    a.click();
  };

  const handleDrillDown = (type: string, data?: any) => {
    let groupedData;
    if (type === "date") groupedData = groupByDate(bills);
    else if (type === "month") groupedData = groupByMonth(bills);
    else if (type === "year") groupedData = groupByYear(bills);
    else if (type === "customer") groupedData = customers;
    else if (type === "product") groupedData = topProducts;
    else if (type === "today") groupedData = groupByDate(stats?.todayBillsList || []);
    setDetailView({ type, data: groupedData, subData: data || null });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (detailView) {
    return (
      <DetailView
        detailView={detailView}
        setDetailView={setDetailView}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        formatShortDate={formatShortDate}
        formatDay={formatDay}
        setSelectedBill={setSelectedBill}
        selectedBill={selectedBill}
        setSelectedCustomer={setSelectedCustomer}
        selectedCustomer={selectedCustomer}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
              <span className="text-xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                Ghanshyam Enterprises
                <span className="text-slate-300">•</span>
                <span className={refreshing ? "text-amber-500" : "text-emerald-500"}>
                  {refreshing ? "🔄 Syncing..." : "🟢 Live"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {lastRefresh.toLocaleTimeString("en-IN")}
                </span>
                <button
                  onClick={() => loadAll(true)}
                  className="text-red-600 hover:text-red-700 font-bold text-[10px] hover:underline"
                >
                  Refresh
                </button>
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="group bg-slate-900 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-slate-200 hover:shadow-red-200"
          >
            <span>🛍️</span>
            <span className="hidden sm:inline">Billing Page</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        {/* TABS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 mb-6 shadow-sm flex gap-1 overflow-x-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "bills", label: "Bills", icon: "🧾", count: bills.length },
            { id: "customers", label: "Customers", icon: "👥", count: customers.length },
            { id: "products", label: "Products", icon: "📦", count: products.length },
            { id: "stock", label: "Stock In/Out", icon: "📈" },
            { id: "profit", label: "Profit", icon: "💵" },  // 🔥 NAYA TAB
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-fit px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">Today's Overview</h2>
                <span className="text-xs text-slate-400 font-medium ml-auto">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Today's Sales"
                  value={formatCurrency(stats?.todayRevenue || 0)}
                  subtitle={`${stats?.todayBills || 0} transactions`}
                  gradient="from-red-500 to-red-700"
                  icon="💰"
                  onClick={() => handleDrillDown("today")}
                />
                <StatCard
                  title="Today's Bills"
                  value={stats?.todayBills || 0}
                  subtitle="bills generated"
                  gradient="from-blue-500 to-blue-700"
                  icon="🧾"
                  onClick={() => handleDrillDown("today")}
                />
                <StatCard
                  title="Total Products"
                  value={products.length}
                  subtitle="in inventory"
                  gradient="from-emerald-500 to-emerald-700"
                  icon="📦"
                  onClick={() => setActiveTab("products")}
                />
                <StatCard
                  title="Low Stock Alert"
                  value={products.filter((p: any) => (p.stock || 0) < 10).length}
                  subtitle="items need restock"
                  gradient="from-amber-500 to-orange-600"
                  icon="⚠️"
                  onClick={() => setActiveTab("products")}
                />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">Analytics & Reports</h2>
                <span className="text-xs text-slate-400 font-medium ml-auto">Click to explore →</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DrillCard title="Date-wise Sales" subtitle="Daily breakdown" icon="📅" color="bg-blue-500" onClick={() => handleDrillDown("date")} />
                <DrillCard title="Monthly Sales" subtitle="Month by month" icon="📆" color="bg-indigo-500" onClick={() => handleDrillDown("month")} />
                <DrillCard title="Yearly Sales" subtitle="Year over year" icon="📈" color="bg-emerald-500" onClick={() => handleDrillDown("year")} />
                <DrillCard title="Top Customers" subtitle="Best buyers" icon="🏆" color="bg-amber-500" onClick={() => handleDrillDown("customer")} />
                <DrillCard title="Top Products" subtitle="Best sellers" icon="🔥" color="bg-red-500" onClick={() => handleDrillDown("product")} />
                <DrillCard title="Stock In/Out" subtitle="Daily movement" icon="📈" color="bg-teal-500" onClick={() => setActiveTab("stock")} />
                <DrillCard title="Profit Report" subtitle="Kitna kamaya" icon="💵" color="bg-emerald-500" onClick={() => setActiveTab("profit")} />
                <DrillCard title="All Bills" subtitle="Full history" icon="🧾" color="bg-slate-600" onClick={() => setActiveTab("bills")} />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">All-Time Statistics</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(stats?.totalRevenue || 0)}
                  subtitle="lifetime earnings"
                  gradient="from-emerald-500 to-green-700"
                  icon="💎"
                  onClick={() => handleDrillDown("year")}
                />
                <StatCard
                  title="Total Bills"
                  value={stats?.totalBills || 0}
                  subtitle="lifetime"
                  gradient="from-slate-600 to-slate-800"
                  icon="📋"
                  onClick={() => setActiveTab("bills")}
                />
                <StatCard
                  title="Total Customers"
                  value={stats?.uniqueCustomers || 0}
                  subtitle="unique"
                  gradient="from-rose-500 to-rose-700"
                  icon="❤️"
                  onClick={() => handleDrillDown("customer")}
                />
                <StatCard
                  title="Average Bill"
                  value={stats?.totalBills ? formatCurrency(stats.totalRevenue / stats.totalBills) : "₹0"}
                  subtitle="per transaction"
                  gradient="from-teal-500 to-teal-700"
                  icon="📊"
                  onClick={() => setActiveTab("bills")}
                />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">Recent Activity</h2>
                <button
                  onClick={() => setActiveTab("bills")}
                  className="ml-auto text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  View all →
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {bills.slice(0, 5).map((bill: any, idx: number) => (
                  <div
                    key={bill.id}
                    className={`flex justify-between items-center p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      idx !== 0 ? "border-t border-slate-100" : ""
                    }`}
                    onClick={() => setSelectedBill(bill)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {(bill.customerName || "W")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {bill.customerName || "Walk-in Customer"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {bill.invoiceNo} • {formatShortDate(bill.savedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">
                        {formatCurrency(bill.total)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {bill.items?.filter((i: any) => i.productName).length || 0} items
                      </p>
                    </div>
                  </div>
                ))}
                {bills.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-2">📭</p>
                    <p className="text-sm text-slate-400 font-medium">
                      No bills yet. Start billing to see activity here.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* BILLS TAB */}
        {activeTab === "bills" && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Bills History</h2>
                <p className="text-xs text-slate-500">
                  {filteredBills.length} of {bills.length} bills
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDrillDown("date")}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  📅 Group by Date
                </button>
                <button
                  onClick={exportBillsCSV}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  📤 Export CSV
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by invoice number, customer name, or phone..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl outline-none text-sm transition-all"
                value={searchBill}
                onChange={(e) => setSearchBill(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-center">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.map((bill: any) => (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {bill.invoiceNo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{formatDate(bill.savedAt)}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800">
                            {bill.customerName || "Walk-in Customer"}
                          </p>
                          {bill.customerPhone && (
                            <p className="text-xs text-slate-400">📞 {bill.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-lg">
                            {bill.items?.filter((i: any) => i.productName).length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-red-600">
                            {formatCurrency(bill.total)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg text-sm transition-all"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="w-8 h-8 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-sm transition-all"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredBills.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-2">🔍</p>
                    <p className="text-sm text-slate-400 font-medium">
                      {searchBill ? "No bills match your search" : "No bills recorded yet"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === "customers" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Customers Directory</h2>
                <p className="text-xs text-slate-500">
                  {filteredCustomers.length} of {customers.length} customers • Sorted by total spent
                </p>
              </div>
              <button
                onClick={() => handleDrillDown("customer")}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold"
              >
                🏆 Full Ranking
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by name or phone number..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl outline-none text-sm transition-all"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((c: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedCustomer(c);
                    handleDrillDown("customer", c);
                  }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-red-300 hover:-translate-y-0.5 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-100">
                      {(c.name || "W")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">📞 {c.phone}</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-full">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Total Spent
                      </p>
                      <p className="text-base font-bold text-red-600 mt-0.5">
                        {formatCurrency(c.totalSpent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Total Bills
                      </p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">
                        {c.totalBills}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400">
                      Last visit: <span className="font-semibold text-slate-600">{formatShortDate(c.lastVisit)}</span>
                    </p>
                    <span className="text-[10px] text-red-600 font-bold">View →</span>
                  </div>
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <p className="text-4xl mb-2">👥</p>
                  <p className="text-sm text-slate-400 font-medium">
                    {searchCustomer ? "No customers match your search" : "No customers yet"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Products Inventory</h2>
                <p className="text-xs text-slate-500">
                  {filteredProducts.length} of {products.length} products
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDrillDown("product")}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  🔥 Top Selling
                </button>
                <button
                  onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  ➕ Add Product
                </button>
                <button
                  onClick={exportProductsCSV}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  📤 Export
                </button>
              </div>
            </div>

            {products.filter((p: any) => (p.stock || 0) < 10).length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 mb-2">
                      Low Stock Alert — {products.filter((p: any) => (p.stock || 0) < 10).length} products need restocking
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {products.filter((p: any) => (p.stock || 0) < 10).slice(0, 6).map((p: any) => (
                        <span key={p.barcode} className="bg-white px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-800 border border-amber-200 shadow-sm">
                          {p.name} — {p.stock || 0} left
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by product name or barcode..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl outline-none text-sm transition-all"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Barcode</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3 text-right">Purchase</th>
                      <th className="px-4 py-3 text-right">Selling</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p: any) => {
                      const isLow = (p.stock || 0) < 10;
                      const profit = (p.rate || 0) - (p.purchaseRate || 0);
                      return (
                        <tr key={p.barcode} className={`hover:bg-slate-50 transition-colors ${isLow ? "bg-amber-50/50" : ""}`}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {p.barcode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-right text-sm text-amber-600">
                            {p.purchaseRate ? formatCurrency(p.purchaseRate) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                            {formatCurrency(p.rate)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                            {p.purchaseRate ? formatCurrency(profit) : "-"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                            {p.stock || 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isLow ? (
                              <span className="inline-block bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-block bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                onClick={() => handleAddStock(p.barcode, p.name)}
                                className="w-8 h-8 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 rounded-lg text-sm transition-all"
                                title="Stock add karo"
                              >
                                ➕
                              </button>
                              <button
                                onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                                className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg text-sm transition-all"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.barcode)}
                                className="w-8 h-8 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-sm transition-all"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-2">📦</p>
                    <p className="text-sm text-slate-400 font-medium">
                      {searchProduct ? "No products match your search" : "No products in inventory"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STOCK IN/OUT TAB */}
        {activeTab === "stock" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">📈 Stock In/Out Report</h2>
                <p className="text-xs text-slate-500">
                  Daily basis pe kitna stock aaya (IN) aur kitna gaya (OUT)
                </p>
              </div>
              <button
                onClick={exportStockCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
              >
                📤 Export CSV
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { id: "today", label: "Today", icon: "☀️" },
                { id: "week", label: "Last 7 Days", icon: "📅" },
                { id: "month", label: "Last 30 Days", icon: "📆" },
                { id: "all", label: "All Time", icon: "📈" },
              ].map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => setStockView(v.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    stockView === v.id
                      ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-200"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-red-300"
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            {stockSummary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">📥 Stock IN</p>
                  <p className="text-3xl font-black mt-1">+{stockSummary.totalIN || 0}</p>
                  <p className="text-[10px] text-emerald-100 mt-1">
                    {stockSummary.countIN || 0} entries • {formatCurrency(stockSummary.valueIN || 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-100">📤 Stock OUT</p>
                  <p className="text-3xl font-black mt-1">-{stockSummary.totalOUT || 0}</p>
                  <p className="text-[10px] text-red-100 mt-1">
                    {stockSummary.countOUT || 0} entries • {formatCurrency(stockSummary.valueOUT || 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Net Change</p>
                  <p className="text-3xl font-black mt-1">
                    {(stockSummary.net || 0) >= 0 ? "+" : ""}{stockSummary.net || 0}
                  </p>
                  <p className="text-[10px] text-blue-100 mt-1">units</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-100">Net Value</p>
                  <p className="text-2xl font-black mt-1">
                    {formatCurrency((stockSummary.valueIN || 0) - (stockSummary.valueOUT || 0))}
                  </p>
                  <p className="text-[10px] text-purple-100 mt-1">IN - OUT</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">
                  📦 Current Stock Status (kitna bacha)
                </h3>
                <span className="text-xs text-slate-500">
                  Total: {products.reduce((s: number, p: any) => s + (p.stock || 0), 0)} units
                </span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr className="text-left text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                      <th className="px-4 py-2 text-center">Stock</th>
                      <th className="px-4 py-2 text-right">Value</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products
                      .sort((a: any, b: any) => (a.stock || 0) - (b.stock || 0))
                      .map((p: any) => {
                        const isLow = (p.stock || 0) < 10;
                        return (
                          <tr key={p.barcode} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-semibold text-slate-800">{p.name}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{formatCurrency(p.rate)}</td>
                            <td className="px-4 py-2 text-center font-bold text-slate-800">
                              {p.stock || 0}
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-slate-700">
                              {formatCurrency((p.stock || 0) * (p.rate || 0))}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {p.stock === 0 ? (
                                <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Out
                                </span>
                              ) : isLow ? (
                                <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Low
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">No products yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">
                  📋 Stock Movements ({movements.length})
                </h3>
                {stockLoading && <span className="text-xs text-slate-400">Loading...</span>}
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {new Date(m.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                              m.type === "IN"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {m.type === "IN" ? "📥 IN" : "📤 OUT"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {m.productName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 capitalize">
                          {m.reason?.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                          <span className={m.type === "IN" ? "text-emerald-600" : "text-red-600"}>
                            {m.type === "IN" ? "+" : "-"}
                            {m.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">
                          {formatCurrency(m.totalValue || 0)}
                        </td>
                      </tr>
                    ))}
                    {movements.length === 0 && !stockLoading && (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-slate-400">
                          <p className="text-4xl mb-2">📭</p>
                          <p className="text-sm font-medium">No stock movements yet</p>
                          <p className="text-xs mt-1">
                            Product add karo ya bill save karo — record yahan aayega
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs text-blue-800 font-semibold mb-1">💡 Kaise kaam karta hai:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li><b>IN</b> — jab naya product add karo (initial stock), ya "➕" button se stock badhao</li>
                <li><b>OUT</b> — jab billing page se bill save karo (sale), stock automatically kam hota hai</li>
                <li>Har movement yahan date + time ke saath record hoti hai</li>
                <li>Daily basis pe dekhne ke liye "Today" select karo</li>
              </ul>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 🔥 PROFIT TAB (NAYA) */}
        {/* ============================================================ */}
        {activeTab === "profit" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">💵 Profit Report</h2>
                <p className="text-xs text-slate-500">
                  Purchase rate vs selling rate ka difference — kitna profit hua
                </p>
              </div>
            </div>

            {/* View selector */}
            <div className="flex gap-2 flex-wrap">
              {[
                { id: "today", label: "Today", icon: "☀️" },
                { id: "week", label: "Last 7 Days", icon: "📅" },
                { id: "month", label: "Last 30 Days", icon: "📆" },
                { id: "all", label: "All Time", icon: "📈" },
              ].map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => setProfitView(v.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    profitView === v.id
                      ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-200"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-red-300"
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            {profitLoading && (
              <div className="text-center py-8 text-slate-400">Loading profit data...</div>
            )}

            {profitSummary && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">💰 Total Profit</p>
                    <p className="text-3xl font-black mt-1">{formatCurrency(profitSummary.totalProfit)}</p>
                    <p className="text-[10px] text-emerald-100 mt-1">{profitSummary.totalTransactions} sales</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">📈 Total Revenue</p>
                    <p className="text-2xl font-black mt-1">{formatCurrency(profitSummary.totalRevenue)}</p>
                    <p className="text-[10px] text-blue-100 mt-1">selling value</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100">💸 Total Cost</p>
                    <p className="text-2xl font-black mt-1">{formatCurrency(profitSummary.totalCost)}</p>
                    <p className="text-[10px] text-amber-100 mt-1">purchase value</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-100">📦 Qty Sold</p>
                    <p className="text-3xl font-black mt-1">{profitSummary.totalQtySold}</p>
                    <p className="text-[10px] text-purple-100 mt-1">units</p>
                  </div>
                </div>

                {/* Product-wise profit table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800">
                      🏆 Product-wise Profit ({profitSummary.productWise.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3 text-center">Qty Sold</th>
                          <th className="px-4 py-3 text-right">Revenue</th>
                          <th className="px-4 py-3 text-right">Cost</th>
                          <th className="px-4 py-3 text-right">Profit</th>
                          <th className="px-4 py-3 text-center">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profitSummary.productWise.map((p: any, idx: number) => {
                          const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-semibold text-slate-800">{p.productName}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">{p.qtySold}</td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                                {formatCurrency(p.revenue)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-amber-600">
                                {formatCurrency(p.cost)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                                {formatCurrency(p.profit)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold ${
                                  margin >= 20 ? "bg-emerald-100 text-emerald-700" :
                                  margin >= 10 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {margin.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {profitSummary.productWise.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-16 text-slate-400">
                              <p className="text-4xl mb-2">📭</p>
                              <p className="text-sm font-medium">No profit data yet</p>
                              <p className="text-xs mt-1">Bill save karo — profit yahan aayega</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <p className="text-xs text-emerald-800 font-semibold mb-1">💡 Profit Calculation:</p>
                  <ul className="text-xs text-emerald-700 space-y-1 list-disc list-inside">
                    <li><b>Purchase Rate</b> — jo tumne dukandaar ko diya</li>
                    <li><b>Selling Rate</b> — jo customer se liya</li>
                    <li><b>Profit per unit</b> = Selling - Purchase</li>
                    <li><b>Total Profit</b> = Profit per unit × Quantity sold</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* BILL DETAIL MODAL */}
      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {/* PRODUCT MODAL */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
function StatCard({ title, value, subtitle, gradient, icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden text-left w-full`}
    >
      <div className="absolute top-3 right-3 text-3xl opacity-20">{icon}</div>
      <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-[10px] text-white/70 font-medium">{subtitle}</p>
    </button>
  );
}

// ============================================================
// DRILL CARD
// ============================================================
function DrillCard({ title, subtitle, icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-red-300 hover:-translate-y-0.5 transition-all text-left w-full group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center text-white text-lg shadow-md`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>
        </div>
        <span className="text-slate-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all">→</span>
      </div>
    </button>
  );
}

// ============================================================
// DETAIL VIEW
// ============================================================
function DetailView({
  detailView, setDetailView, formatCurrency, formatDate, formatShortDate, formatDay,
  setSelectedBill, selectedBill, setSelectedCustomer, selectedCustomer,
}: any) {
  const { type, data, subData } = detailView;

  const titles: any = {
    date: { title: "Date-wise Sales", subtitle: "Daily breakdown of all sales", icon: "📅" },
    month: { title: "Monthly Sales", subtitle: "Sales grouped by month", icon: "📆" },
    year: { title: "Yearly Sales", subtitle: "Sales grouped by year", icon: "📈" },
    customer: { title: "Customer Ranking", subtitle: "Customers sorted by total spent", icon: "🏆" },
    product: { title: "Top Selling Products", subtitle: "Best performing products", icon: "🔥" },
    today: { title: "Today's Details", subtitle: "Sales made today", icon: "☀️" },
  };

  const t = titles[type] || titles.date;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => { setDetailView(null); setSelectedCustomer(null); }}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-bold transition-all"
          >
            ←
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 text-xl">
              {t.icon}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t.title}</h1>
              <p className="text-xs text-slate-500 font-medium">{t.subtitle}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        {Array.isArray(data) && data.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Entries</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{data.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(data.reduce((s: number, d: any) => s + (d.revenue || d.totalSpent || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Bills</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {data.reduce((s: number, d: any) => s + (d.bills || d.totalBills || 0), 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Best Day/Entry</p>
              <p className="text-sm font-bold text-emerald-600 mt-1 truncate">
                {(() => {
                  const sorted = [...data].sort((a: any, b: any) =>
                    (b.revenue || b.totalSpent || 0) - (a.revenue || a.totalSpent || 0)
                  );
                  const best = sorted[0];
                  return best?.dateObj
                    ? formatShortDate(best.dateObj.toISOString())
                    : best?.monthShort || best?.year || best?.name || "-";
                })()}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {type === "date" && data.map((d: any, idx: number) => (
            <DateRow key={idx} data={d} formatCurrency={formatCurrency} formatDay={formatDay} setSelectedBill={setSelectedBill} />
          ))}

          {type === "today" && data.map((d: any, idx: number) => (
            <DateRow key={idx} data={d} formatCurrency={formatCurrency} formatDay={formatDay} setSelectedBill={setSelectedBill} />
          ))}

          {type === "month" && data.map((m: any, idx: number) => (
            <MonthRow key={idx} data={m} formatCurrency={formatCurrency} setSelectedBill={setSelectedBill} />
          ))}

          {type === "year" && data.map((y: any, idx: number) => (
            <YearRow key={idx} data={y} formatCurrency={formatCurrency} setSelectedBill={setSelectedBill} />
          ))}

          {type === "customer" && data.map((c: any, idx: number) => (
            <CustomerRow
              key={idx}
              data={c}
              rank={idx + 1}
              formatCurrency={formatCurrency}
              formatShortDate={formatShortDate}
              setSelectedCustomer={setSelectedCustomer}
            />
          ))}

          {type === "product" && data.map((p: any, idx: number) => (
            <ProductRow key={idx} data={p} rank={idx + 1} formatCurrency={formatCurrency} />
          ))}

          {data.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm text-slate-400 font-medium">No data available yet</p>
            </div>
          )}
        </div>
      </main>

      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

// ============================================================
// ROW COMPONENTS
// ============================================================
function DateRow({ data, formatCurrency, formatDay, setSelectedBill }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex flex-col items-center justify-center text-white shadow-md">
            <span className="text-xl font-bold">{data.dateObj.getDate()}</span>
            <span className="text-[9px] uppercase font-bold">
              {data.dateObj.toLocaleDateString("en-IN", { month: "short" })}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{formatDay(data.dateObj)}</p>
            <p className="text-xs text-slate-500">
              {data.bills} bills • {data.items} items • {data.customerCount} customers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-red-600">{formatCurrency(data.revenue)}</p>
            <p className="text-[10px] text-slate-400">revenue</p>
          </div>
          <span className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-2">
          {data.billList.map((bill: any) => (
            <button
              key={bill.id}
              onClick={() => setSelectedBill(bill)}
              className="w-full flex justify-between items-center p-3 bg-white rounded-xl hover:bg-red-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {bill.customerName || "Walk-in Customer"}
                </p>
                <p className="text-xs text-slate-400 font-mono">{bill.invoiceNo}</p>
              </div>
              <p className="text-sm font-bold text-red-600">{formatCurrency(bill.total)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthRow({ data, formatCurrency, setSelectedBill }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-md">
            <span className="text-lg font-bold">
              {data.monthName.split(" ")[0].slice(0, 3)}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">{data.monthName}</p>
            <p className="text-xs text-slate-500">
              {data.bills} bills • {data.items} items • {data.customerCount} customers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-red-600">{formatCurrency(data.revenue)}</p>
            <p className="text-[10px] text-slate-400">revenue</p>
          </div>
          <span className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-2">
          {data.billList.slice(0, 10).map((bill: any) => (
            <button
              key={bill.id}
              onClick={() => setSelectedBill(bill)}
              className="w-full flex justify-between items-center p-3 bg-white rounded-xl hover:bg-red-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {bill.customerName || "Walk-in Customer"}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(bill.savedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <p className="text-sm font-bold text-red-600">{formatCurrency(bill.total)}</p>
            </button>
          ))}
          {data.billList.length > 10 && (
            <p className="text-center text-xs text-slate-400 py-2">
              +{data.billList.length - 10} more bills
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function YearRow({ data, formatCurrency, setSelectedBill }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-md">
            <span className="text-xl font-bold">{data.year}</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">Year {data.year}</p>
            <p className="text-xs text-slate-500">
              {data.bills} bills • {data.items} items • {data.customerCount} customers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-red-600">{formatCurrency(data.revenue)}</p>
            <p className="text-[10px] text-slate-400">revenue</p>
          </div>
          <span className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-2">
          {data.billList.slice(0, 10).map((bill: any) => (
            <button
              key={bill.id}
              onClick={() => setSelectedBill(bill)}
              className="w-full flex justify-between items-center p-3 bg-white rounded-xl hover:bg-red-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {bill.customerName || "Walk-in Customer"}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(bill.savedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <p className="text-sm font-bold text-red-600">{formatCurrency(bill.total)}</p>
            </button>
          ))}
          {data.billList.length > 10 && (
            <p className="text-center text-xs text-slate-400 py-2">
              +{data.billList.length - 10} more bills
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerRow({ data, rank, formatCurrency, formatShortDate, setSelectedCustomer }: any) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <button
      onClick={() => setSelectedCustomer(data)}
      className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-lg hover:border-red-300 transition-all flex justify-between items-center text-left"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md">
          {(data.name || "W")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
            {data.name}
            {medal && <span className="text-lg">{medal}</span>}
          </p>
          <p className="text-xs text-slate-500">📞 {data.phone}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Last visit: {formatShortDate(data.lastVisit)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-red-600">{formatCurrency(data.totalSpent)}</p>
        <p className="text-[10px] text-slate-400">{data.totalBills} bills</p>
        <p className="text-[10px] text-red-600 font-bold mt-1">View →</p>
      </div>
    </button>
  );
}

function ProductRow({ data, rank, formatCurrency }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md">
          #{rank}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{data.name}</p>
          <p className="text-xs text-slate-500 font-mono">{data.barcode}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Sold {data.totalQty} times • {data.timesSold} transactions
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-red-600">{formatCurrency(data.totalRevenue)}</p>
        <p className="text-[10px] text-slate-400">{data.totalQty} qty sold</p>
      </div>
    </div>
  );
}

// ============================================================
// BILL DETAIL MODAL
// ============================================================
function BillDetailModal({ bill, onClose, formatCurrency, formatDate }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bill Details</h2>
            <p className="text-xs text-slate-500">Invoice breakdown</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center">✕</button>
        </div>
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Invoice No.</span>
              <span className="font-mono text-xs font-semibold text-slate-800">{bill.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date & Time</span>
              <span className="font-semibold text-slate-800 text-xs">{formatDate(bill.savedAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Payment</span>
              <span className="font-semibold text-slate-800">{bill.paymentMethod}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Customer</p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white font-bold">
                {(bill.customerName || "W")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{bill.customerName || "Walk-in Customer"}</p>
                {bill.customerPhone && <p className="text-xs text-slate-500">📞 {bill.customerPhone}</p>}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Items</p>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              {bill.items?.filter((i: any) => i.productName).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-700">
                    {item.productName} <span className="text-slate-400">× {item.quantity}</span>
                  </span>
                  <span className="font-semibold text-slate-800">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-800">{formatCurrency(bill.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">GST</span>
              <span className="font-semibold text-slate-800">{formatCurrency(bill.gstAmount)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span className="font-semibold">-{formatCurrency(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-800">Total</span>
              <span className="text-2xl font-bold text-red-600">{formatCurrency(bill.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER DETAIL MODAL
// ============================================================
function CustomerDetailModal({ customer, onClose, formatCurrency, formatDate }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Customer Details</h2>
            <p className="text-xs text-slate-500">Purchase history</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center">✕</button>
        </div>
        <div className="flex items-center gap-4 mb-5 p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {(customer.name || "W")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-lg">{customer.name}</p>
            <p className="text-xs text-slate-500">📞 {customer.phone}</p>
            {customer.address && customer.address !== "-" && (
              <p className="text-xs text-slate-400 mt-1">📍 {customer.address}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Spent</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(customer.totalSpent)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Bills</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{customer.totalBills}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">First Visit</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{formatDate(customer.firstVisit)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Visit</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{formatDate(customer.lastVisit)}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Purchase History ({customer.billList?.length || 0})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {customer.billList?.map((bill: any) => (
              <div key={bill.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs font-mono text-slate-500">{bill.invoiceNo}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(bill.savedAt)}</p>
                </div>
                <p className="text-sm font-bold text-red-600">{formatCurrency(bill.total)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ✅ UPDATED PRODUCT MODAL (with purchase rate)
// ============================================================
function ProductModal({ product, onClose, onSave }: any) {
  const [form, setForm] = useState({
    barcode: product?.barcode || "",
    name: product?.name || "",
    purchaseRate: product?.purchaseRate || "",  // 🔥 NAYA
    rate: product?.rate || "",
    stock: product?.stock || "",
  });

  const update = (key: string, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const profit = Number(form.rate) - Number(form.purchaseRate);
  const profitMargin = form.purchaseRate && Number(form.purchaseRate) > 0
    ? (profit / Number(form.purchaseRate)) * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {product ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="text-xs text-slate-500">
              Purchase + Selling rate dono bharo
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Barcode</label>
            <input
              type="text"
              placeholder="Auto-generate if empty"
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              value={form.barcode}
              onChange={(e) => update("barcode", e.target.value)}
              disabled={!!product?.barcode}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Product Name *</label>
            <input
              type="text"
              placeholder="e.g. Tv"
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-amber-600 mb-1.5 block">
                💰 Purchase Rate (₹)
              </label>
              <input
                type="number"
                placeholder="485"
                className="w-full px-3 py-2.5 bg-amber-50 border-2 border-amber-200 focus:border-amber-400 rounded-xl outline-none text-sm"
                value={form.purchaseRate}
                onChange={(e) => update("purchaseRate", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-emerald-600 mb-1.5 block">
                🏷️ Selling Rate (₹) *
              </label>
              <input
                type="number"
                placeholder="500"
                className="w-full px-3 py-2.5 bg-emerald-50 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl outline-none text-sm"
                value={form.rate}
                onChange={(e) => update("rate", e.target.value)}
              />
            </div>
          </div>

          {form.purchaseRate && form.rate && profit > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-700">
                💵 <b>Profit per unit:</b> {formatCurrency(profit)}
                <span className="text-emerald-600 ml-2">({profitMargin.toFixed(1)}%)</span>
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Stock</label>
            <input
              type="number"
              placeholder="0"
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold text-sm shadow-lg shadow-red-200"
          >
            {product ? "Update" : "Save"} Product
          </button>
        </div>
      </div>
    </div>
  );
}

// formatCurrency helper for ProductModal
function formatCurrency(amount: number) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}