// lib/productDatabase.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { logStockMovement } from "./stockDatabase";

// GET ALL PRODUCTS
export async function getProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

// FIND BY BARCODE
export async function findProductByBarcode(barcode: string) {
  if (!barcode) return null;
  const ref = doc(db, "products", String(barcode));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

// ADD PRODUCT (with purchase + selling rate)
export async function addProduct(product: {
  barcode: string;
  name: string;
  purchaseRate?: number;   // 🔥 NAYA
  rate: number;            // Selling rate
  stock?: number;
}) {
  if (!product.barcode) throw new Error("Barcode required");
  const ref = doc(db, "products", String(product.barcode));
  const existing = await getDoc(ref);

  const data = {
    barcode: String(product.barcode),
    name: String(product.name || "").trim(),
    purchaseRate: Number(product.purchaseRate) || 0,   // 🔥 NAYA
    rate: Number(product.rate) || 0,
    stock: Number(product.stock) || 0,
    updatedAt: Date.now(),
  };

  await setDoc(ref, data, { merge: true });

  if (!existing.exists() && data.stock > 0) {
    await logStockMovement({
      barcode: data.barcode,
      productName: data.name,
      type: "IN",
      quantity: data.stock,
      reason: "purchase",
      rate: data.purchaseRate || data.rate,
      totalValue: data.stock * (data.purchaseRate || data.rate),
      note: "Initial stock",
    });
  }
  return data;
}

// DELETE PRODUCT
export async function deleteProduct(barcode: string) {
  if (!barcode) throw new Error("Barcode required");
  await deleteDoc(doc(db, "products", String(barcode)));
}

// INCREASE STOCK
export async function increaseStock(barcode: string, qty: number, note?: string) {
  if (!barcode || qty <= 0) throw new Error("Invalid qty");
  const ref = doc(db, "products", String(barcode));
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Product not found");

  const product = snap.data() as any;
  await updateDoc(ref, {
    stock: increment(qty),
    updatedAt: Date.now(),
  });

  await logStockMovement({
    barcode: String(barcode),
    productName: product.name,
    type: "IN",
    quantity: qty,
    reason: "manual_add",
    rate: product.purchaseRate || product.rate,
    totalValue: qty * (product.purchaseRate || product.rate),
    note: note || "Manual stock add",
  });
}

// DECREASE STOCK (with profit calculation)
export async function decreaseStock(
  barcode: string,
  qty: number,
  note?: string,
  reason: any = "sale",
  sellingRate?: number   // 🔥 NAYA — bill ka rate
) {
  if (!barcode || qty <= 0) throw new Error("Invalid qty");
  const ref = doc(db, "products", String(barcode));
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Product not found");

  const product = snap.data() as any;
  const newStock = Math.max(0, (product.stock || 0) - qty);
  await updateDoc(ref, { stock: newStock, updatedAt: Date.now() });

  // 🔥 Profit calculation
  const actualSelling = sellingRate || product.rate || 0;
  const purchaseRate = product.purchaseRate || 0;
  const profitPerUnit = actualSelling - purchaseRate;
  const totalProfit = profitPerUnit * qty;

  await logStockMovement({
    barcode: String(barcode),
    productName: product.name,
    type: "OUT",
    quantity: qty,
    reason,
    rate: actualSelling,
    purchaseRate: purchaseRate,     // 🔥 NAYA
    profit: totalProfit,            // 🔥 NAYA
    totalValue: qty * actualSelling,
    note: note || "Stock decreased",
  });
}

// BULK ADD
export async function bulkAddProducts(products: any[]) {
  let count = 0;
  for (const p of products) {
    if (!p.barcode || !p.name) continue;
    await addProduct(p);
    count++;
  }
  return count;
}

export async function seedDefaultProducts() {
  return 0;
}