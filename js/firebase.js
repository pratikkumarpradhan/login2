/* =========================================================
   PROJECTKART
   Firebase Configuration
   ========================================================= */

   import {
    initializeApp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getStorage
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


/*
|--------------------------------------------------------------------------
| Firebase Configuration
|--------------------------------------------------------------------------
|
| Replace these values with the configuration from:
|
| Firebase Console
| → Project Settings
| → Your apps
| → Web app
|
*/

const firebaseConfig = {

    apiKey:
        "YOUR_FIREBASE_API_KEY",

    authDomain:
        "YOUR_PROJECT_ID.firebaseapp.com",

    projectId:
        "YOUR_PROJECT_ID",

    storageBucket:
        "YOUR_PROJECT_ID.firebasestorage.app",

    messagingSenderId:
        "YOUR_MESSAGING_SENDER_ID",

    appId:
        "YOUR_FIREBASE_APP_ID"
};


/*
|--------------------------------------------------------------------------
| Initialize Firebase
|--------------------------------------------------------------------------
*/

const app =
    initializeApp(firebaseConfig);


/*
|--------------------------------------------------------------------------
| Firebase Authentication
|--------------------------------------------------------------------------
*/

const auth =
    getAuth(app);


/*
|--------------------------------------------------------------------------
| Firestore
|--------------------------------------------------------------------------
*/

const db =
    getFirestore(app);


/*
|--------------------------------------------------------------------------
| Firebase Storage
|--------------------------------------------------------------------------
*/

const storage =
    getStorage(app);


/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

export {
    app,
    auth,
    db,
    storage
};