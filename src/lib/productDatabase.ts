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
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { logStockMovement } from "./stockDatabase";

// ============================================================
// GET ALL PRODUCTS
// ============================================================
export async function getProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

// ============================================================
// FIND BY BARCODE
// ============================================================
export async function findProductByBarcode(barcode: string) {
  if (!barcode) return null;
  const ref = doc(db, "products", String(barcode));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

// ============================================================
// ADD PRODUCT (upsert by barcode)
// ============================================================
export async function addProduct(product: {
  barcode: string;
  name: string;
  rate: number;
  stock?: number;
}) {
  if (!product.barcode) throw new Error("Barcode required");
  const ref = doc(db, "products", String(product.barcode));
  const existing = await getDoc(ref);

  const data = {
    barcode: String(product.barcode),
    name: String(product.name || "").trim(),
    rate: Number(product.rate) || 0,
    stock: Number(product.stock) || 0,
    updatedAt: Date.now(),
  };

  await setDoc(ref, data, { merge: true });

  // ✅ Log stock IN only if it's a new product with initial stock > 0
  if (!existing.exists() && data.stock > 0) {
    await logStockMovement({
      barcode: data.barcode,
      productName: data.name,
      type: "IN",
      quantity: data.stock,
      reason: "purchase",
      rate: data.rate,
      totalValue: data.stock * data.rate,
      note: "Initial stock on product creation",
    });
  }

  return data;
}

// ============================================================
// DELETE PRODUCT
// ============================================================
export async function deleteProduct(barcode: string) {
  if (!barcode) throw new Error("Barcode required");
  await deleteDoc(doc(db, "products", String(barcode)));
}

// ============================================================
// INCREASE STOCK (naya maal aaya) ✅ logs IN
// ============================================================
export async function increaseStock(barcode: string, qty: number, note?: string) {
  if (!barcode || qty <= 0) throw new Error("Invalid barcode or qty");
  const ref = doc(db, "products", String(barcode));
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Product not found");

  const product = snap.data() as any;
  await updateDoc(ref, {
    stock: increment(qty),
    updatedAt: Date.now(),
  });

  // ✅ Log IN
  await logStockMovement({
    barcode: String(barcode),
    productName: product.name,
    type: "IN",
    quantity: qty,
    reason: "manual_add",
    rate: product.rate,
    totalValue: qty * (product.rate || 0),
    note: note || "Manual stock add",
  });
}

// ============================================================
// DECREASE STOCK (bill / damage) ✅ logs OUT
// ============================================================
export async function decreaseStock(barcode: string, qty: number, note?: string, reason: any = "sale") {
  if (!barcode || qty <= 0) throw new Error("Invalid barcode or qty");
  const ref = doc(db, "products", String(barcode));
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Product not found");

  const product = snap.data() as any;
  const newStock = Math.max(0, (product.stock || 0) - qty);
  await updateDoc(ref, {
    stock: newStock,
    updatedAt: Date.now(),
  });

  // ✅ Log OUT
  await logStockMovement({
    barcode: String(barcode),
    productName: product.name,
    type: "OUT",
    quantity: qty,
    reason,
    rate: product.rate,
    totalValue: qty * (product.rate || 0),
    note: note || "Stock decreased",
  });
}

// ============================================================
// BULK ADD
// ============================================================
export async function bulkAddProducts(products: any[]) {
  let count = 0;
  for (const p of products) {
    if (!p.barcode || !p.name) continue;
    await addProduct(p);
    count++;
  }
  return count;
}

// ============================================================
// SEED — ab empty hai kyunki default products nahi chahiye
// ============================================================
export async function seedDefaultProducts() {
  // ❌ No default products — user adds manually
  return 0;
}