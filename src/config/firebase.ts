import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import { getDatabase, ref } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCO_Ozy3IGNdX7BDJ_udYyoxAheLkzMH10",
  authDomain: "aimask-fced2.firebaseapp.com",
  projectId: "aimask-fced2",
  storageBucket: "aimask-fced2.firebasestorage.app",
  messagingSenderId: "95092464255",
  appId: "1:95092464255:web:b19ded0e9aefc2af083d4a",
  measurementId: "G-5YDPWFE7Q2",
  databaseURL: "https://aimask-fced2-default-rtdb.firebaseio.com/"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Database references
export const dbRefs = {
  users: ref(db, 'users'),
  sessions: ref(db, 'sessions')
};

// Initialize invisible reCAPTCHA
export const initializeRecaptcha = () => {
  const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {
      // Callback is optional for invisible recaptcha
    },
    'expired-callback': () => {
      // Handle expiration if needed
    }
  });
  
  return recaptcha;
};

export default app;

