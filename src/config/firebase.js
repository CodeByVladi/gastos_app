import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAMkHuTJ3k016b43JtQnDOTtGHy12ka17A",
  authDomain: "gastos-app-3dfec.firebaseapp.com",
  projectId: "gastos-app-3dfec",
  storageBucket: "gastos-app-3dfec.firebasestorage.app",
  messagingSenderId: "125815740533",
  appId: "1:125815740533:web:fdf26640aad84a345b803c",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth
export const auth = getAuth(app);

// Inicializar Firestore
export const db = getFirestore(app);

export default app;
