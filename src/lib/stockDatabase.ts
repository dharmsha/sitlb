// lib/stockDatabase.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export type StockMovement = {
  id?: string;
  barcode: string;
  productName: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: "purchase" | "sale" | "manual_add" | "manual_reduce" | "return" | "damage";
  rate?: number;
  totalValue?: number;
  note?: string;
  createdAt: number;
  createdAtISO: string;
};

export async function logStockMovement(
  movement: Omit<StockMovement, "id" | "createdAt" | "createdAtISO">
) {
  const now = new Date();
  const docRef = await addDoc(collection(db, "stockMovements"), {
    ...movement,
    createdAt: now.getTime(),
    createdAtISO: now.toISOString(),
  });
  return docRef.id;
}

export async function getAllMovements(): Promise<StockMovement[]> {
  const q = query(collection(db, "stockMovements"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getMovementsByRange(
  startMs: number,
  endMs: number
): Promise<StockMovement[]> {
  const q = query(
    collection(db, "stockMovements"),
    where("createdAt", ">=", startMs),
    where("createdAt", "<=", endMs),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getMovementsForDay(date = new Date()): Promise<StockMovement[]> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return getMovementsByRange(start.getTime(), end.getTime());
}

export async function getDailySummary(date = new Date()) {
  const movements = await getMovementsForDay(date);
  const totalIN = movements.filter((m) => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
  const totalOUT = movements.filter((m) => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);
  const valueIN = movements.filter((m) => m.type === "IN").reduce((s, m) => s + (m.totalValue || 0), 0);
  const valueOUT = movements.filter((m) => m.type === "OUT").reduce((s, m) => s + (m.totalValue || 0), 0);

  return {
    date,
    movements,
    totalIN,
    totalOUT,
    net: totalIN - totalOUT,
    valueIN,
    valueOUT,
    countIN: movements.filter((m) => m.type === "IN").length,
    countOUT: movements.filter((m) => m.type === "OUT").length,
  };
}

export async function getProductWiseSummary(startMs: number, endMs: number) {
  const movements = await getMovementsByRange(startMs, endMs);
  const map = new Map<string, any>();

  for (const m of movements) {
    const key = m.barcode || m.productName;
    if (!map.has(key)) {
      map.set(key, {
        barcode: m.barcode,
        productName: m.productName,
        inQty: 0, outQty: 0, inValue: 0, outValue: 0,
      });
    }
    const row = map.get(key);
    if (m.type === "IN") {
      row.inQty += m.quantity;
      row.inValue += m.totalValue || 0;
    } else {
      row.outQty += m.quantity;
      row.outValue += m.totalValue || 0;
    }
  }
  return Array.from(map.values()).sort((a: any, b: any) => b.outQty - a.outQty);
}