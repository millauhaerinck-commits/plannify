
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyASksUWJE1xovRu0mHjZTF-u0ec9tSMlVU",
  authDomain: "plannify-cce2b.firebaseapp.com",
  projectId: "plannify-cce2b",
  storageBucket: "plannify-cce2b.firebasestorage.app",
  messagingSenderId: "489237900624",
  appId: "1:489237900624:web:8457246d200df99cae9055",
  measurementId: "G-ZCZJG2YV30"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
