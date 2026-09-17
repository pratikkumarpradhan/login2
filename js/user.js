/* =========================================================
   PROJECTKART
   User Profile
   ========================================================= */

   import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    updateProfile
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "./firebase.js";


/*
|--------------------------------------------------------------------------
| Get User
|--------------------------------------------------------------------------
*/

export async function getUser(uid) {

    if (!uid) {
        return null;
    }


    const reference =
        doc(
            db,
            "users",
            uid
        );


    const snapshot =
        await getDoc(
            reference
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


/*
|--------------------------------------------------------------------------
| Update User Profile
|--------------------------------------------------------------------------
*/

export async function updateUserProfile(
    uid,
    data
) {

    if (!uid) {
        throw new Error(
            "User ID is required."
        );
    }


    const cleanData = {};


    if (
        typeof data.name === "string"
        &&
        data.name.trim()
    ) {

        cleanData.name =
            data.name.trim();
    }


    if (
        typeof data.phone === "string"
    ) {

        cleanData.phone =
            data.phone.trim();
    }


    if (
        typeof data.address === "string"
    ) {

        cleanData.address =
            data.address.trim();
    }


    cleanData.updatedAt =
        serverTimestamp();


    await updateDoc(
        doc(
            db,
            "users",
            uid
        ),
        cleanData
    );


    /*
    |--------------------------------------------------------------------------
    | Update Firebase Auth Display Name
    |--------------------------------------------------------------------------
    */

    const currentUser =
        auth.currentUser;


    if (
        currentUser
        &&
        currentUser.uid === uid
        &&
        cleanData.name
    ) {

        await updateProfile(
            currentUser,
            {
                displayName:
                    cleanData.name
            }
        );
    }


    return true;
}