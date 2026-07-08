import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAweTJTRMWuTt1m2LcNbE98Y57ht_1HZuc",
  authDomain: "amigobot-33090.firebaseapp.com",
  projectId: "amigobot-33090",
  storageBucket: "amigobot-33090.firebasestorage.app",
  messagingSenderId: "409538756420",
  appId: "1:409538756420:web:5a0cb164ca514988392111",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;