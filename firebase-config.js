// ===== VANTA FIREBASE CONFIGURATION =====
// Initialize Firebase services for cross-device data sync

const firebaseConfig = {
    apiKey: "AIzaSyD8IUd3d-s3P0Bpo4nADjWwTzro5i0TDX8",
    authDomain: "vanta-41f14.firebaseapp.com",
    projectId: "vanta-41f14",
    storageBucket: "vanta-41f14.firebasestorage.app",
    messagingSenderId: "365325706021",
    appId: "1:365325706021:web:f2ee0e79a7205a940d70cc",
    measurementId: "G-EYSQ643M4S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Initialize Storage
const storage = firebase.storage();

console.log('[Vanta] Firebase initialized successfully');
