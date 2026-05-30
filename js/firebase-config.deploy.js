// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBhcDhn5BJuTG0isUKYFOoGKfMoeX7FzpE",
  authDomain: "lik-81e6e.firebaseapp.com",
  databaseURL: "https://lik-81e6e-default-rtdb.firebaseio.com",
  projectId: "lik-81e6e",
  storageBucket: "lik-81e6e.firebasestorage.app",
  messagingSenderId: "511733919470",
  appId: "1:511733919470:web:ce52a820e54db4a3eecdff",
  measurementId: "G-CWGWT13BLK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);