// src/lib/billDatabase.ts
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const BILLS_COLLECTION = 'bills';

// ============================================================
// 💾 SAVE BILL
// ============================================================
export const saveBill = async (billData: any) => {
  try {
    const billRef = doc(db, BILLS_COLLECTION, billData.invoiceNo);
    await setDoc(billRef, {
      ...billData,
      savedAt: new Date().toISOString(),
    });
    return billData.invoiceNo;
  } catch (error) {
    console.error('Error saving bill:', error);
    throw error;
  }
};

// ============================================================
// 📥 GET ALL BILLS
// ============================================================
export const getAllBills = async () => {
  try {
    const snapshot = await getDocs(collection(db, BILLS_COLLECTION));
    const bills = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return bills.sort(
      (a: any, b: any) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return [];
  }
};

// ============================================================
// 🗑️ DELETE BILL
// ============================================================
export const deleteBill = async (billId: string) => {
  try {
    await deleteDoc(doc(db, BILLS_COLLECTION, billId));
  } catch (error) {
    console.error('Error deleting bill:', error);
    throw error;
  }
};

// ============================================================
// 📊 BASIC STATS
// ============================================================
export const getStats = async () => {
  try {
    const allBills = await getAllBills();
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const todayBills = allBills.filter(
      (b: any) => new Date(b.savedAt).toDateString() === today
    );
    const monthBills = allBills.filter((b: any) => {
      const d = new Date(b.savedAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const sum = (arr: any[]) =>
      arr.reduce((s: number, b: any) => s + (b.total || 0), 0);

    const uniqueCustomers = new Set(
      allBills.filter((b: any) => b.customerPhone).map((b: any) => b.customerPhone)
    ).size;

    const totalItemsSold = allBills.reduce((sum: number, b: any) => {
      return sum + (b.items?.filter((i: any) => i.productName).length || 0);
    }, 0);

    return {
      todayBills: todayBills.length,
      todayRevenue: sum(todayBills),
      monthBills: monthBills.length,
      monthRevenue: sum(monthBills),
      totalBills: allBills.length,
      totalRevenue: sum(allBills),
      uniqueCustomers,
      totalItemsSold,
      allBills,
      todayBillsList: todayBills,
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      todayBills: 0, todayRevenue: 0, monthBills: 0, monthRevenue: 0,
      totalBills: 0, totalRevenue: 0, uniqueCustomers: 0, totalItemsSold: 0,
      allBills: [], todayBillsList: [],
    };
  }
};

// ============================================================
// 📅 GROUP BY DATE (Date-wise breakdown)
// ============================================================
export const groupByDate = (bills: any[]) => {
  const map = new Map<string, any>();
  bills.forEach((bill) => {
    const date = new Date(bill.savedAt).toDateString();
    if (!map.has(date)) {
      map.set(date, {
        date,
        dateObj: new Date(bill.savedAt),
        revenue: 0,
        bills: 0,
        items: 0,
        customers: new Set(),
        billList: [],
      });
    }
    const day = map.get(date)!;
    day.revenue += bill.total || 0;
    day.bills += 1;
    day.items += bill.items?.filter((i: any) => i.productName).length || 0;
    if (bill.customerPhone) day.customers.add(bill.customerPhone);
    day.billList.push(bill);
  });
  return Array.from(map.values())
    .map((d) => ({ ...d, customerCount: d.customers.size }))
    .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
};

// ============================================================
// 📅 GROUP BY MONTH
// ============================================================
export const groupByMonth = (bills: any[]) => {
  const map = new Map<string, any>();
  bills.forEach((bill) => {
    const d = new Date(bill.savedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        monthName: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        monthShort: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        revenue: 0,
        bills: 0,
        items: 0,
        customers: new Set(),
        billList: [],
      });
    }
    const m = map.get(key)!;
    m.revenue += bill.total || 0;
    m.bills += 1;
    m.items += bill.items?.filter((i: any) => i.productName).length || 0;
    if (bill.customerPhone) m.customers.add(bill.customerPhone);
    m.billList.push(bill);
  });
  return Array.from(map.values())
    .map((m) => ({ ...m, customerCount: m.customers.size }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
};

// ============================================================
// 📅 GROUP BY YEAR
// ============================================================
export const groupByYear = (bills: any[]) => {
  const map = new Map<number, any>();
  bills.forEach((bill) => {
    const year = new Date(bill.savedAt).getFullYear();
    if (!map.has(year)) {
      map.set(year, {
        year,
        revenue: 0,
        bills: 0,
        items: 0,
        customers: new Set(),
        billList: [],
      });
    }
    const y = map.get(year)!;
    y.revenue += bill.total || 0;
    y.bills += 1;
    y.items += bill.items?.filter((i: any) => i.productName).length || 0;
    if (bill.customerPhone) y.customers.add(bill.customerPhone);
    y.billList.push(bill);
  });
  return Array.from(map.values())
    .map((y) => ({ ...y, customerCount: y.customers.size }))
    .sort((a, b) => b.year - a.year);
};

// ============================================================
// 👥 GET CUSTOMERS (Aggregated)
// ============================================================
export const getCustomers = async () => {
  try {
    const allBills = await getAllBills();
    const customerMap = new Map();

    allBills.forEach((bill: any) => {
      const key = bill.customerPhone || bill.customerName || "walk-in";
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: bill.customerName || "Walk-in",
          phone: bill.customerPhone || "-",
          address: bill.customerAddress || "-",
          totalSpent: 0,
          totalBills: 0,
          lastVisit: bill.savedAt,
          firstVisit: bill.savedAt,
          billList: [],
        });
      }
      const c = customerMap.get(key);
      c.totalSpent += bill.total || 0;
      c.totalBills += 1;
      c.billList.push(bill);
      if (new Date(bill.savedAt) > new Date(c.lastVisit)) c.lastVisit = bill.savedAt;
      if (new Date(bill.savedAt) < new Date(c.firstVisit)) c.firstVisit = bill.savedAt;
    });

    return Array.from(customerMap.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent
    );
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
};

// ============================================================
// 📦 TOP SELLING PRODUCTS
// ============================================================
export const getTopProducts = async () => {
  try {
    const allBills = await getAllBills();
    const productMap = new Map<string, any>();

    allBills.forEach((bill: any) => {
      bill.items?.forEach((item: any) => {
        if (!item.productName) return;
        const key = item.productName;
        if (!productMap.has(key)) {
          productMap.set(key, {
            name: item.productName,
            barcode: item.barcode || "-",
            totalQty: 0,
            totalRevenue: 0,
            timesSold: 0,
          });
        }
        const p = productMap.get(key);
        p.totalQty += parseInt(item.quantity) || 1;
        p.totalRevenue += item.amount || 0;
        p.timesSold += 1;
      });
    });

    return Array.from(productMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );
  } catch (error) {
    console.error('Error getting top products:', error);
    return [];
  }
};