// lib/productDatabase.js
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const PRODUCTS_COLLECTION = 'products';

// ============================================================
// 📥 GET ALL PRODUCTS
// ============================================================
export const getProducts = async () => {
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// ============================================================
// ➕ ADD OR UPDATE PRODUCT (barcode = unique ID)
// ============================================================
export const addProduct = async (product) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, product.barcode);
    await setDoc(productRef, {
      barcode: product.barcode,
      name: product.name,
      rate: parseFloat(product.rate) || 0,
      stock: parseInt(product.stock) || 0,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return product;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

// ============================================================
// 🗑️ DELETE PRODUCT
// ============================================================
export const deleteProduct = async (barcode) => {
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, barcode));
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// ============================================================
// 🔍 FIND BY BARCODE
// ============================================================
export const findProductByBarcode = async (barcode) => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, barcode);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error finding product:', error);
    return null;
  }
};

// ============================================================
// 📥 BULK ADD (CSV import)
// ============================================================
export const bulkAddProducts = async (products) => {
  try {
    const promises = products.map(p => addProduct(p));
    await Promise.all(promises);
    return products.length;
  } catch (error) {
    console.error('Error bulk adding:', error);
    throw error;
  }
};

// ============================================================
// 🌱 SEED DEFAULT PRODUCTS (pehli baar ke liye)
// ============================================================
export const seedDefaultProducts = async () => {
  const defaults = [
    { barcode: '8901725123456', name: 'Aashirvaad Atta - 5kg', rate: 180, stock: 50 },
    { barcode: '8901058001234', name: 'India Gate Basmati - 5kg', rate: 350, stock: 30 },
    { barcode: '8901030521234', name: 'Tata Salt - 1kg', rate: 20, stock: 200 },
    { barcode: '8901262010016', name: 'Amul Butter - 500g', rate: 180, stock: 15 },
    { barcode: '8904109401234', name: 'Patanjali Sugar - 1kg', rate: 45, stock: 100 },
    { barcode: '8901063012345', name: 'Amul Milk - 1L', rate: 60, stock: 25 },
    { barcode: '8906002123456', name: 'Maggi Noodles - 100g', rate: 15, stock: 100 },
    { barcode: '8901719123456', name: 'Parle-G Biscuit - 200g', rate: 30, stock: 80 },
    { barcode: '8901491101234', name: 'Lays Chips - 100g', rate: 20, stock: 60 },
    { barcode: '8902080123456', name: 'Coca Cola - 500ml', rate: 40, stock: 40 },
    { barcode: 'KS001', name: 'Potato - 1kg', rate: 30, stock: 80 },
    { barcode: 'KS002', name: 'Onion - 1kg', rate: 25, stock: 90 },
    { barcode: 'KS003', name: 'Tomato - 1kg', rate: 40, stock: 60 },
  ];
  await bulkAddProducts(defaults);
  return defaults.length;
};