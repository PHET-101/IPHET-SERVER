// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, collection, getDocs } from "firebase/firestore"; 

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAIYt7KH3HBKjLYaHiycZR3KrfHjAIIKH0",
    authDomain: "iphet-store.firebaseapp.com",
    projectId: "iphet-store",
    storageBucket: "iphet-store.appspot.com",
    messagingSenderId: "856355053746",
    appId: "1:856355053746:web:7e90d3746bd3eb6061e9ab",
    measurementId: "G-QQWKSTHENH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check if Analytics is supported before initializing it
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            const analytics = getAnalytics(app);
        } else {
            console.log("Firebase Analytics is not supported in this environment.");
        }
    });
}

async function getIPHETDB(db) {
    const iphetDb = collection(db, 'iphet_database');
    const iphetDbSnapshot = await getDocs(iphetDb);
    const iphetList = iphetDbSnapshot.docs.map(doc => doc.data());
    return iphetList;
}

getIPHETDB(db).then(iphetDb => {
    console.log(iphetDb);
}).catch(error => {
    console.error("Error getting documents: ", error);
});
