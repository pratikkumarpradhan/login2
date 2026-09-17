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
    apiKey: "AIzaSyCv991Txao0U3vcHoFuL8sbVOQhOm7H7sk",
    authDomain: "notificationapp-854d0.firebaseapp.com",
    projectId: "notificationapp-854d0",
    storageBucket: "notificationapp-854d0.firebasestorage.app",
    messagingSenderId: "308832764565",
    appId: "1:308832764565:web:c8f5c919183e661dc8d19c"
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