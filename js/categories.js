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

import {
    FALLBACK_CATEGORIES
} from "./catalog-data.js";


const CATEGORIES = "categories";


/*
|--------------------------------------------------------------------------
| Get Active Categories
|--------------------------------------------------------------------------
*/

export async function getCategories() {

    try {

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

        if (snapshot.empty) {
            return FALLBACK_CATEGORIES;
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
            "Unable to load categories from Firebase:",
            error
        );

        return FALLBACK_CATEGORIES;
    }
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

    try {

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

        if (snapshot.exists()) {
            return {
                id:
                    snapshot.id,

                ...snapshot.data()
            };
        }

    } catch (error) {

        console.error(
            "Unable to load category from Firebase:",
            error
        );
    }

    return FALLBACK_CATEGORIES.find(
        category =>
            category.id === categoryId
    ) || null;
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


document.addEventListener("DOMContentLoaded", () => {
    initCategoriesPage();
});


async function initCategoriesPage() {
    const grid = document.querySelector("[data-categories-grid]");

    if (!grid) {
        return;
    }

    try {
        const categories = await getCategories();
        renderCategoriesPage(categories);
        setupCategorySearch(categories);
    } catch (error) {
        console.error("Categories page error:", error);
        renderCategoriesPage(FALLBACK_CATEGORIES);
    }
}


function renderCategoriesPage(categories) {
    const grid = document.querySelector("[data-categories-grid]");
    const empty = document.querySelector("[data-categories-empty]");

    if (!grid) {
        return;
    }

    if (!categories.length) {
        grid.innerHTML = "";
        if (empty) {
            empty.hidden = false;
        }
        return;
    }

    if (empty) {
        empty.hidden = true;
    }

    grid.innerHTML = categories.map((category, index) => {
        const number = String(index + 1).padStart(2, "0");
        const href = category.id === "project-kits"
            ? "project-kits.html"
            : `category.html?category=${encodeURIComponent(category.id)}`;

        return `
            <a href="${href}" class="category-card">
                <div class="category-card__image">
                    <img src="${category.image || ""}" alt="${category.name}" loading="lazy">
                </div>
                <div class="category-card__overlay"></div>
                <div class="category-card__number">${number}</div>
                <div class="category-card__content">
                    <h3>${category.name}</h3>
                    <p>${category.description || ""}</p>
                    <span class="category-card__link">Explore <span>›</span></span>
                </div>
            </a>
        `;
    }).join("");
}


function setupCategorySearch(categories) {
    const input = document.querySelector("[data-category-search]");

    if (!input) {
        return;
    }

    input.addEventListener("input", () => {
        const term = input.value.toLowerCase().trim();
        const results = !term
            ? categories
            : categories.filter(category =>
                `${category.name} ${category.description || ""}`.toLowerCase().includes(term)
            );
        renderCategoriesPage(results);
    });
}