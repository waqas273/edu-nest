// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC-UXlTicLvOzW2UKjkD9Cb-bEtPm-UKwY",
    authDomain: "edunest-6cf38.firebaseapp.com",
    projectId: "edunest-6cf38",
    storageBucket: "edunest-6cf38.firebasestorage.app",
    messagingSenderId: "423116565706",
    appId: "1:423116565706:web:fa23f494d5046b44f09833",
    measurementId: "G-358H3WYWHT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with experimentalForceLongPolling to fix "Could not reach backend" / QUIC errors
// This forces the SDK to use long-polling which is more robust in restricted networks or when UDP is blocked.
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export const storage = getStorage(app);

export default app;
