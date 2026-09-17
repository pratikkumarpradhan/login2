/* =========================================================
   PROJECTKART
   Categories Database
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
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase.js";

import {
    createSlug
} from "./utils.js";


const CATEGORIES = "categories";


/*
|--------------------------------------------------------------------------
| Get Active Categories
|--------------------------------------------------------------------------
*/

export async function getCategories() {

    const reference =
        collection(
            db,
            CATEGORIES
        );

    const categoryQuery =
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
            categoryQuery
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
| Get Single Category
|--------------------------------------------------------------------------
*/

export async function getCategory(
    categoryId
) {

    if (!categoryId) {
        return null;
    }

    const reference =
        doc(
            db,
            CATEGORIES,
            categoryId
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
| Get All Categories
|--------------------------------------------------------------------------
|
| Admin use.
|--------------------------------------------------------------------------
*/

export async function getAllCategories() {

    const reference =
        collection(
            db,
            CATEGORIES
        );

    const categoryQuery =
        query(
            reference,
            orderBy(
                "order",
                "asc"
            )
        );

    const snapshot =
        await getDocs(
            categoryQuery
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
| Add Category
|--------------------------------------------------------------------------
*/

export async function addCategory(
    category
) {

    if (!category.name) {
        throw new Error(
            "Category name is required."
        );
    }

    const data = {

        name:
            category.name.trim(),

        slug:
            category.slug ||
            createSlug(
                category.name
            ),

        description:
            category.description || "",

        image:
            category.image || "",

        active:
            category.active !== false,

        order:
            Number(
                category.order || 0
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
                CATEGORIES
            ),
            data
        );

    return reference.id;
}


/*
|--------------------------------------------------------------------------
| Update Category
|--------------------------------------------------------------------------
*/

export async function updateCategory(
    categoryId,
    category
) {

    if (!categoryId) {
        throw new Error(
            "Category ID is required."
        );
    }

    const data = {

        name:
            category.name?.trim() || "",

        slug:
            category.slug ||
            createSlug(
                category.name
            ),

        description:
            category.description || "",

        image:
            category.image || "",

        active:
            category.active !== false,

        order:
            Number(
                category.order || 0
            ),

        updatedAt:
            serverTimestamp()
    };

    await updateDoc(

        doc(
            db,
            CATEGORIES,
            categoryId
        ),

        data
    );

    return true;
}


/*
|--------------------------------------------------------------------------
| Delete Category
|--------------------------------------------------------------------------
*/

export async function deleteCategory(
    categoryId
) {

    if (!categoryId) {
        throw new Error(
            "Category ID is required."
        );
    }

    await deleteDoc(
        doc(
            db,
            CATEGORIES,
            categoryId
        )
    );

    return true;
}


/*
|--------------------------------------------------------------------------
| Show / Hide Category
|--------------------------------------------------------------------------
*/

export async function setCategoryActive(
    categoryId,
    active
) {

    await updateDoc(

        doc(
            db,
            CATEGORIES,
            categoryId
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