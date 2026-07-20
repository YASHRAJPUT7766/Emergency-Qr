import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqLThvBn19ajSG1uqeA6JtnouA5u1RxuM",
  authDomain: "yash-software.firebaseapp.com",
  databaseURL: "https://yash-software-default-rtdb.firebaseio.com",
  projectId: "yash-software",
  storageBucket: "yash-software.firebasestorage.app",
  messagingSenderId: "333775666671",
  appId: "1:333775666671:web:4f9cbca22a8200b3d78a1a",
  measurementId: "G-F747YYSCWX",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
