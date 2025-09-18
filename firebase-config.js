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
const auth = firebase.auth();

// Collections
const collections = {
    reagent: db.collection("reagents"),
    equipment: db.collection("equipment"),
    consumable: db.collection("consumables"),
    glassware: db.collection("glasswares"),
    users: db.collection("users"),
    accessRequests: db.collection("accessRequests")
};


// Initialize admin user function (run this once manually in browser console)
window.initializeAdmin = async function() {
    try {
        const adminEmail = 'temitope.adaba@gmail.com';
        const adminPassword = 'Olusegun@07'; // Change this
        
        const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
        const user = userCredential.user;
        
        await db.collection('users').doc(user.uid).set({
            email: adminEmail,
            fullName: 'System Administrator',
            role: 'admin',
            status: 'approved',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isInitialAdmin: true
        });
        
        console.log('Admin user initialized successfully!');
        console.log('You can now sign in with', adminEmail);
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
};