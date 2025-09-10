// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyDdAGSRZ4DGo1juvSwTa4RaUYHa37PFrZU",
    authDomain: "inventory-f08f3.firebaseapp.com",
    projectId: "inventory-f08f3",
    storageBucket: "inventory-f08f3.firebasestorage.app",
    messagingSenderId: "761013033405",
    appId: "1:761013033405:web:d34f2c1befa1cc23361ad4",
    measurementId: "G-J9ZNQYZNXK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Collections
const collections = {
    reagent: db.collection("reagents"),
    equipment: db.collection("equipment"),
    consumable: db.collection("consumables"),
    glassware: db.collection("glasswares")
};