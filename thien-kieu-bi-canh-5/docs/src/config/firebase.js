const firebaseConfig = { apiKey: "AIzaSyAtnPNb-nGauIQZOwVcErwF3FiYcIeN5bw", authDomain: "thienbicanhmong.firebaseapp.com", projectId: "thienbicanhmong", storageBucket: "thienbicanhmong.firebasestorage.app", messagingSenderId: "921080331892", appId: "1:921080331892:web:ef3ed0c8be1e99cb4c5b21" };
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
export const auth = firebase.auth(); export const firestore = firebase.firestore();
