// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtn7YdyBBOr-V2RuFzY_oPnDxhzdvm3Tw",
  authDomain: "dataclnt-a5e5e.firebaseapp.com",
  projectId: "dataclnt-a5e5e",
  storageBucket: "dataclnt-a5e5e.firebasestorage.app",
  messagingSenderId: "19403251964",
  appId: "1:19403251964:web:bda631d2cbd3f9685d3779",
  measurementId: "G-P1F3E1C8DK"
};

// Singleton — baar baar initialize na ho
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);