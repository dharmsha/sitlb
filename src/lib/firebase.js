// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';          // 👈 ye line add karo
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDKC7rgGRAlVpceHarJg2l8f5uS5ROxs6g",
  authDomain: "ghanshyamenterprises-e0d1c.firebaseapp.com",
  projectId: "ghanshyamenterprises-e0d1c",
  storageBucket: "ghanshyamenterprises-e0d1c.firebasestorage.app",
  messagingSenderId: "875362293054",
  appId: "1:875362293054:web:b9c9e7358f8f350a8e886f",
  measurementId: "G-85M6XE07XR"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);                 // 👈 ye line add karo
export const db = getFirestore(app);