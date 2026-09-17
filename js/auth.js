/* =========================================================
   PROJECTKART
   User Authentication
   ========================================================= */

   import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


/*
|--------------------------------------------------------------------------
| Register User
|--------------------------------------------------------------------------
*/

export async function registerUser({
    name,
    email,
    password
}) {

    if (!name || !email || !password) {
        throw new Error(
            "Please fill in all required fields."
        );
    }


    if (password.length < 6) {
        throw new Error(
            "Password must contain at least 6 characters."
        );
    }


    const credentials =
        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );


    const user =
        credentials.user;


    /*
    |--------------------------------------------------------------------------
    | Firebase Auth Profile
    |--------------------------------------------------------------------------
    */

    await updateProfile(
        user,
        {
            displayName: name
        }
    );


    /*
    |--------------------------------------------------------------------------
    | Firestore User Profile
    |--------------------------------------------------------------------------
    */

    await setDoc(
        doc(
            db,
            "users",
            user.uid
        ),
        {
            uid:
                user.uid,

            name:
                name,

            email:
                email.toLowerCase(),

            role:
                "user",

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()
        }
    );


    return user;
}


/*
|--------------------------------------------------------------------------
| Login User
|--------------------------------------------------------------------------
*/

export async function loginUser(
    email,
    password
) {

    if (!email || !password) {
        throw new Error(
            "Email and password are required."
        );
    }


    const credentials =
        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


    return credentials.user;
}


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

export async function logoutUser() {

    await signOut(auth);

    window.location.href =
        "index.html";
}


/*
|--------------------------------------------------------------------------
| Current User Listener
|--------------------------------------------------------------------------
*/

export function watchUser(
    callback
) {

    return onAuthStateChanged(
        auth,
        callback
    );
}


/*
|--------------------------------------------------------------------------
| Get Current User
|--------------------------------------------------------------------------
*/

export function getCurrentUser() {

    return auth.currentUser;
}


/*
|--------------------------------------------------------------------------
| Get Firestore User Profile
|--------------------------------------------------------------------------
*/

export async function getUserProfile(
    uid
) {

    if (!uid) {
        return null;
    }


    const userReference =
        doc(
            db,
            "users",
            uid
        );


    const snapshot =
        await getDoc(
            userReference
        );


    if (!snapshot.exists()) {
        return null;
    }


    return {
        id:
            snapshot.id,

        ...snapshot.data()
    };
}