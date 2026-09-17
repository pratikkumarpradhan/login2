/* =========================================================
   PROJECTKART
   Product Database
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

import {
    FALLBACK_PRODUCTS
} from "./catalog-data.js";


const PRODUCTS =
    "products";


/*
|--------------------------------------------------------------------------
| Get All Active Products
|--------------------------------------------------------------------------
*/

export async function getProducts() {

    try {

        const reference =
            collection(
                db,
                PRODUCTS
            );


        const productQuery =
            query(
                reference,

                where(
                    "active",
                    "==",
                    true
                ),

                orderBy(
                    "createdAt",
                    "desc"
                )
            );


        const snapshot =
            await getDocs(
                productQuery
            );


        if (snapshot.empty) {
            return FALLBACK_PRODUCTS;
        }


        return snapshot.docs.map(
            document => ({

                id:
                    document.id,

                ...document.data()
            })
        );

    } catch (error) {

        console.error(
            "Unable to load products from Firebase:",
            error
        );

        return FALLBACK_PRODUCTS;
    }
}


/*
|--------------------------------------------------------------------------
| Get Featured Products
|--------------------------------------------------------------------------
*/

export async function getFeaturedProducts(
    maximum = 8
) {

    const reference =
        collection(
            db,
            PRODUCTS
        );


    const productQuery =
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
                "createdAt",
                "desc"
            ),

            limit(
                maximum
            )
        );


    const snapshot =
        await getDocs(
            productQuery
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
| Get Single Product
|--------------------------------------------------------------------------
*/

export async function getProduct(
    productId
) {

    if (!productId) {
        return null;
    }


    try {

        const reference =
            doc(
                db,
                PRODUCTS,
                productId
            );


        const snapshot =
            await getDoc(
                reference
            );


        if (snapshot.exists()) {

            return {

                id:
                    snapshot.id,

                ...snapshot.data()
            };
        }

    } catch (error) {

        console.error(
            "Unable to load product from Firebase:",
            error
        );
    }


    return FALLBACK_PRODUCTS.find(
        product => product.id === productId
    ) || null;
}


/*
|--------------------------------------------------------------------------
| Get Products By Category
|--------------------------------------------------------------------------
*/

export async function getProductsByCategory(
    categoryId
) {

    if (!categoryId) {
        return [];
    }


    try {

    const reference =
        collection(
            db,
            PRODUCTS
        );


    const productQuery =
        query(

            reference,

            where(
                "categoryId",
                "==",
                categoryId
            ),

            where(
                "active",
                "==",
                true
            ),

            orderBy(
                "createdAt",
                "desc"
            )
        );


    const snapshot =
        await getDocs(
            productQuery
        );


    if (!snapshot.empty) {

        return snapshot.docs.map(
            document => ({

                id:
                    document.id,

                ...document.data()
            })
        );
    }

    } catch (error) {

        console.error(
            "Unable to load category products from Firebase:",
            error
        );
    }


    return FALLBACK_PRODUCTS.filter(
        product =>
            product.categoryId === categoryId
            ||
            product.categoryName === categoryId
    );
}


/*
|--------------------------------------------------------------------------
| Search Products
|--------------------------------------------------------------------------
|
| Firestore is not a full text search engine.
| For the initial version we load active products and filter
| client-side. This works well for a small/medium catalogue.
|
*/

export async function searchProducts(
    searchTerm
) {

    const products =
        await getProducts();


    const search =
        String(
            searchTerm || ""
        )
        .toLowerCase()
        .trim();


    if (!search) {
        return products;
    }


    return products.filter(
        product => {

            const name =
                String(
                    product.name || ""
                ).toLowerCase();


            const description =
                String(
                    product.description || ""
                ).toLowerCase();


            const category =
                String(
                    product.categoryName || ""
                ).toLowerCase();


            return (
                name.includes(search)
                ||
                description.includes(search)
                ||
                category.includes(search)
            );
        }
    );
}


/* =========================================================
   ADMIN FUNCTIONS
   ========================================================= */


/*
|--------------------------------------------------------------------------
| Get ALL Products
|--------------------------------------------------------------------------
|
| Admin dashboard only.
| Firestore Security Rules will decide whether the caller
| is actually allowed to read hidden products.
|
*/

export async function getAllProducts() {

    const reference =
        collection(
            db,
            PRODUCTS
        );


    const snapshot =
        await getDocs(
            reference
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
| Add Product
|--------------------------------------------------------------------------
*/

export async function addProduct(
    product
) {

    if (!product.name) {
        throw new Error(
            "Product name is required."
        );
    }


    const data = {

        name:
            product.name.trim(),

        slug:
            product.slug || "",

        description:
            product.description || "",

        categoryId:
            product.categoryId || "",

        categoryName:
            product.categoryName || "",

        price:
            Number(
                product.price || 0
            ),

        oldPrice:
            Number(
                product.oldPrice || 0
            ),

        stock:
            Number(
                product.stock || 0
            ),

        image:
            product.image || "",

        badge:
            product.badge || "",

        featured:
            Boolean(
                product.featured
            ),

        active:
            product.active !== false,

        createdAt:
            serverTimestamp(),

        updatedAt:
            serverTimestamp()
    };


    const reference =
        await addDoc(
            collection(
                db,
                PRODUCTS
            ),
            data
        );


    return reference.id;
}


/*
|--------------------------------------------------------------------------
| Update Product
|--------------------------------------------------------------------------
*/

export async function updateProduct(
    productId,
    product
) {

    if (!productId) {
        throw new Error(
            "Product ID is required."
        );
    }


    const data = {

        name:
            product.name?.trim() || "",

        slug:
            product.slug || "",

        description:
            product.description || "",

        categoryId:
            product.categoryId || "",

        categoryName:
            product.categoryName || "",

        price:
            Number(
                product.price || 0
            ),

        oldPrice:
            Number(
                product.oldPrice || 0
            ),

        stock:
            Number(
                product.stock || 0
            ),

        image:
            product.image || "",

        badge:
            product.badge || "",

        featured:
            Boolean(
                product.featured
            ),

        active:
            product.active !== false,

        updatedAt:
            serverTimestamp()
    };


    await updateDoc(

        doc(
            db,
            PRODUCTS,
            productId
        ),

        data
    );


    return true;
}


/*
|--------------------------------------------------------------------------
| Delete Product
|--------------------------------------------------------------------------
*/

export async function deleteProduct(
    productId
) {

    if (!productId) {
        throw new Error(
            "Product ID is required."
        );
    }


    await deleteDoc(
        doc(
            db,
            PRODUCTS,
            productId
        )
    );


    return true;
}


/*
|--------------------------------------------------------------------------
| Show / Hide Product
|--------------------------------------------------------------------------
*/

export async function setProductActive(
    productId,
    active
) {

    if (!productId) {
        throw new Error(
            "Product ID is required."
        );
    }


    await updateDoc(

        doc(
            db,
            PRODUCTS,
            productId
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


/*
|--------------------------------------------------------------------------
| Set Featured
|--------------------------------------------------------------------------
*/

export async function setProductFeatured(
    productId,
    featured
) {

    await updateDoc(

        doc(
            db,
            PRODUCTS,
            productId
        ),

        {
            featured:
                Boolean(featured),

            updatedAt:
                serverTimestamp()
        }
    );


    return true;
}