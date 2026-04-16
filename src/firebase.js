import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAK0g8KJ9j9xe4_ym20TtuzotzLLG4w7Vg",
  authDomain: "pixel-paint-pro.firebaseapp.com",
  projectId: "pixel-paint-pro",
  storageBucket: "pixel-paint-pro.firebasestorage.app",
  messagingSenderId: "995864402072",
  appId: "1:995864402072:web:c89aaf3ca0d24b997158ed",
  measurementId: "G-0WYWT3Y27H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export { signInWithPopup };