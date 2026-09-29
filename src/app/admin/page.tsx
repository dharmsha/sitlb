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
import { getProducts, deleteProduct, addProduct } from "@/lib/productDatabase";

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
  const [detailView, setDetailView] = useState<any>(null); // 🔥 Drill-down state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  // ============================================================
  // FILTERS
  // ============================================================
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

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleDeleteBill = async (id: string) => {
    if (!confirm("Delete this bill permanently?")) return;
    await deleteBill(id);
    loadAll();
  };

  const handleDeleteProduct = async (barcode: string) => {
    if (!confirm("Delete this product permanently?")) return;
    await deleteProduct(barcode);
    loadAll();
  };

  const handleSaveProduct = async (product: any) => {
    if (!product.name || !product.rate) {
      alert("Product name and rate are required.");
      return;
    }
    await addProduct(product);
    setShowProductModal(false);
    setEditingProduct(null);
    loadAll();
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
      "Barcode,Name,Rate,Stock\n" +
      products.map((p: any) => `${p.barcode},"${p.name}",${p.rate},${p.stock || 0}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${Date.now()}.csv`;
    a.click();
  };

  // 🔥 DRILL-DOWN HANDLERS
  const handleDrillDown = (type: string, data?: any) => {
    let groupedData;
    if (type === "date") {
      groupedData = groupByDate(bills);
    } else if (type === "month") {
      groupedData = groupByMonth(bills);
    } else if (type === "year") {
      groupedData = groupByYear(bills);
    } else if (type === "customer") {
      groupedData = customers;
    } else if (type === "product") {
      groupedData = topProducts;
    } else if (type === "today") {
      groupedData = groupByDate(stats?.todayBillsList || []);
    }
    setDetailView({ type, data: groupedData, subData: data || null });
  };

  // ============================================================
  // LOADING
  // ============================================================
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

  // ============================================================
  // DETAIL VIEW (Full Screen Drill-Down)
  // ============================================================
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

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
              <span className="text-xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-500 font-medium">Krishna Store • Management Console</p>
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

        {/* ============================================================ */}
        {/* DASHBOARD TAB */}
        {/* ============================================================ */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* TODAY */}
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

            {/* QUICK ACTIONS (Drill-Down Cards) */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">Analytics & Reports</h2>
                <span className="text-xs text-slate-400 font-medium ml-auto">Click to explore →</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DrillCard
                  title="Date-wise Sales"
                  subtitle="Daily breakdown"
                  icon="📅"
                  color="bg-blue-500"
                  onClick={() => handleDrillDown("date")}
                />
                <DrillCard
                  title="Monthly Sales"
                  subtitle="Month by month"
                  icon="📆"
                  color="bg-indigo-500"
                  onClick={() => handleDrillDown("month")}
                />
                <DrillCard
                  title="Yearly Sales"
                  subtitle="Year over year"
                  icon="📈"
                  color="bg-emerald-500"
                  onClick={() => handleDrillDown("year")}
                />
                <DrillCard
                  title="Top Customers"
                  subtitle="Best buyers"
                  icon="🏆"
                  color="bg-amber-500"
                  onClick={() => handleDrillDown("customer")}
                />
                <DrillCard
                  title="Top Products"
                  subtitle="Best sellers"
                  icon="🔥"
                  color="bg-red-500"
                  onClick={() => handleDrillDown("product")}
                />
                <DrillCard
                  title="This Month"
                  subtitle="Current month"
                  icon="🗓️"
                  color="bg-purple-500"
                  onClick={() => handleDrillDown("month")}
                />
                <DrillCard
                  title="All Bills"
                  subtitle="Full history"
                  icon="🧾"
                  color="bg-slate-600"
                  onClick={() => setActiveTab("bills")}
                />
                <DrillCard
                  title="All Customers"
                  subtitle="Complete list"
                  icon="👥"
                  color="bg-pink-500"
                  onClick={() => setActiveTab("customers")}
                />
              </div>
            </section>

            {/* ALL TIME */}
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

            {/* RECENT BILLS */}
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

        {/* BILLS TAB (same as before, but with drill) */}
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
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p: any) => {
                      const isLow = (p.stock || 0) < 10;
                      return (
                        <tr key={p.barcode} className={`hover:bg-slate-50 transition-colors ${isLow ? "bg-amber-50/50" : ""}`}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {p.barcode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                            {formatCurrency(p.rate)}
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
// STAT CARD (Clickable)
// ============================================================
function StatCard({ title, value, subtitle, gradient, icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden text-left w-full`}
    >
      <div className="absolute top-3 right-3 text-3xl opacity-20">{icon}</div>
      <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-[10px] text-white/70 font-medium">{subtitle}</p>
    </button>
  );
}

// ============================================================
// DRILL CARD (Clickable)
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
// DETAIL VIEW (Full Screen)
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
        {/* Summary */}
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

        {/* Data List */}
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

      {/* Bill Modal */}
      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {/* Customer Detail Modal */}
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
// PRODUCT MODAL
// ============================================================
function ProductModal({ product, onClose, onSave }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {product ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="text-xs text-slate-500">
              {product ? "Update product information" : "Fill in the product details"}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Barcode</label>
            <input
              type="text"
              placeholder="Enter barcode"
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
              value={product?.barcode || ""}
              onChange={(e) => onSave({ ...product, barcode: e.target.value }, true)}
              disabled={!!product?.barcode}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Product Name *</label>
            <input
              type="text"
              placeholder="e.g. Amul Butter 500g"
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
              value={product?.name || ""}
              onChange={(e) => onSave({ ...product, name: e.target.value }, true)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Rate (₹) *</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
                value={product?.rate || ""}
                onChange={(e) => onSave({ ...product, rate: e.target.value }, true)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Stock Quantity</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
                value={product?.stock || ""}
                onChange={(e) => onSave({ ...product, stock: e.target.value }, true)}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all">
            Cancel
          </button>
          <button
            onClick={() => onSave(product, false)}
            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-200"
          >
            {product ? "Update" : "Save"} Product
          </button>
        </div>
      </div>
    </div>
  );
}