/* =========================================================
   PROJECTKART
   Project Kits Database
   ========================================================= */

   import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase.js";


const KITS = "kits";


/*
|--------------------------------------------------------------------------
| Get Active Kits
|--------------------------------------------------------------------------
*/

export async function getKits() {

    const reference =
        collection(
            db,
            KITS
        );

    const kitQuery =
        query(
            reference,

            where(
                "active",
                "==",
                true
            ),

            orderBy(
                "order",
                "asc"
            )
        );

    const snapshot =
        await getDocs(
            kitQuery
        );

    return snapshot.docs.map(
        document => ({
            id:
                document.id,

            ...document.data()
        })
    );
}


/*
|--------------------------------------------------------------------------
| Get Featured Kits
|--------------------------------------------------------------------------
*/

export async function getFeaturedKits(
    maximum = 6
) {

    const reference =
        collection(
            db,
            KITS
        );

    const kitQuery =
        query(
            reference,

            where(
                "active",
                "==",
                true
            ),

            where(
                "featured",
                "==",
                true
            ),

            orderBy(
                "order",
                "asc"
            ),

            limit(
                maximum
            )
        );

    const snapshot =
        await getDocs(
            kitQuery
        );

    return snapshot.docs.map(
        document => ({
            id:
                document.id,

            ...document.data()
        })
    );
}


/*
|--------------------------------------------------------------------------
| Get Single Kit
|--------------------------------------------------------------------------
*/

export async function getKit(
    kitId
) {

    if (!kitId) {
        return null;
    }

    const reference =
        doc(
            db,
            KITS,
            kitId
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
| ADMIN — Get All Kits
|--------------------------------------------------------------------------
*/

export async function getAllKits() {

    const reference =
        collection(
            db,
            KITS
        );

    const kitQuery =
        query(
            reference,
            orderBy(
                "order",
                "asc"
            )
        );

    const snapshot =
        await getDocs(
            kitQuery
        );

    return snapshot.docs.map(
        document => ({
            id:
                document.id,

            ...document.data()
        })
    );
}


/*
|--------------------------------------------------------------------------
| ADMIN — Add Kit
|--------------------------------------------------------------------------
*/

export async function addKit(
    kit
) {

    if (!kit.name) {
        throw new Error(
            "Kit name is required."
        );
    }

    const data = {

        name:
            kit.name.trim(),

        description:
            kit.description || "",

        difficulty:
            kit.difficulty || "Beginner",

        price:
            Number(
                kit.price || 0
            ),

        oldPrice:
            Number(
                kit.oldPrice || 0
            ),

        image:
            kit.image || "",

        active:
            kit.active !== false,

        featured:
            Boolean(
                kit.featured
            ),

        order:
            Number(
                kit.order || 0
            ),

        createdAt:
            serverTimestamp(),

        updatedAt:
            serverTimestamp()
    };

    const reference =
        await addDoc(
            collection(
                db,
                KITS
            ),
            data
        );

    return reference.id;
}


/*
|--------------------------------------------------------------------------
| ADMIN — Update Kit
|--------------------------------------------------------------------------
*/

export async function updateKit(
    kitId,
    kit
) {

    if (!kitId) {
        throw new Error(
            "Kit ID is required."
        );
    }

    const data = {

        name:
            kit.name?.trim() || "",

        description:
            kit.description || "",

        difficulty:
            kit.difficulty || "Beginner",

        price:
            Number(
                kit.price || 0
            ),

        oldPrice:
            Number(
                kit.oldPrice || 0
            ),

        image:
            kit.image || "",

        active:
            kit.active !== false,

        featured:
            Boolean(
                kit.featured
            ),

        order:
            Number(
                kit.order || 0
            ),

        updatedAt:
            serverTimestamp()
    };

    await updateDoc(

        doc(
            db,
            KITS,
            kitId
        ),

        data
    );

    return true;
}


/*
|--------------------------------------------------------------------------
| ADMIN — Delete Kit
|--------------------------------------------------------------------------
*/

export async function deleteKit(
    kitId
) {

    if (!kitId) {
        throw new Error(
            "Kit ID is required."
        );
    }

    await deleteDoc(
        doc(
            db,
            KITS,
            kitId
        )
    );

    return true;
}


/*
|--------------------------------------------------------------------------
| ADMIN — Show / Hide Kit
|--------------------------------------------------------------------------
*/

export async function setKitActive(
    kitId,
    active
) {

    await updateDoc(

        doc(
            db,
            KITS,
            kitId
        ),

        {
            active:
                Boolean(active),

            updatedAt:
                serverTimestamp()
        }
    );

    return true;
}