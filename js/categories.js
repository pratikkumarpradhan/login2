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
    createSlug,
    escapeHTML
} from "./utils.js";

import {
    FALLBACK_CATEGORIES
} from "./catalog-data.js";

const FALLBACK_BY_ID = Object.fromEntries(
    FALLBACK_CATEGORIES.map(category => [category.id, category])
);


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
    if (!document.querySelector("[data-categories-grid]")) {
        return;
    }

    initCategoriesChrome();
    initCategoriesPage();
});


function initCategoriesChrome() {
    const header = document.getElementById("siteHeader");
    const scrollTop = document.getElementById("scrollTopButton");
    const form = document.getElementById("navbarSearch");
    const input = document.getElementById("globalSearchInput");

    const onScroll = () => {
        header?.classList.toggle("is-scrolled", window.scrollY > 12);
        scrollTop?.classList.toggle("is-visible", window.scrollY > 480);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    form?.addEventListener("submit", event => {
        event.preventDefault();
        const query = input?.value.trim();
        window.location.href = query
            ? `shop.html?search=${encodeURIComponent(query)}`
            : "shop.html";
    });
}


async function initCategoriesPage() {
    const grid = document.querySelector("[data-categories-grid]");

    if (!grid) {
        return;
    }

    renderCategoriesPage(FALLBACK_CATEGORIES);

    try {
        const categories = await getCategories();
        renderCategoriesPage(categories.length ? categories : FALLBACK_CATEGORIES);
        setupCategorySearch(categories.length ? categories : FALLBACK_CATEGORIES);
    } catch (error) {
        console.error("Categories page error:", error);
        renderCategoriesPage(FALLBACK_CATEGORIES);
        setupCategorySearch(FALLBACK_CATEGORIES);
    }
}


function hydrateCategory(category) {
    const fallback = FALLBACK_BY_ID[category.id] || {};
    const tags = Array.isArray(category.tags) && category.tags.length
        ? category.tags
        : fallback.tags || [];

    return {
        ...fallback,
        ...category,
        tags,
        itemCount: Number.isFinite(Number(category.itemCount))
            ? Number(category.itemCount)
            : Number(fallback.itemCount || 0),
        image: category.image || fallback.image || "assets/images/hero/hero-workspace.jpg"
    };
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

    grid.innerHTML = categories.map((raw, index) => {
        const category = hydrateCategory(raw);
        const number = String(index + 1).padStart(2, "0");
        const count = String(category.itemCount).padStart(2, "0");
        const href = category.id === "project-kits"
            ? "project-kits.html"
            : `shop.html?category=${encodeURIComponent(category.id)}`;
        const tags = category.tags.map(tag =>
            `<span>${escapeHTML(tag)}</span>`
        ).join("");

        return `
            <a href="${href}" class="explore-card">
                <div class="explore-card__media">
                    <img src="${escapeHTML(category.image)}" alt="${escapeHTML(category.name)}" loading="lazy">
                </div>
                <div class="explore-card__overlay"></div>
                <div class="explore-card__meta">
                    <span>${number} / ${count} items</span>
                    <span class="explore-card__arrow" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M7 17 17 7"></path>
                            <path d="M9 7h8v8"></path>
                        </svg>
                    </span>
                </div>
                <div class="explore-card__content">
                    <h3>${escapeHTML(category.name)}</h3>
                    <p>${escapeHTML(category.description || "")}</p>
                    <div class="explore-card__tags">${tags}</div>
                    <span class="explore-card__link">Explore category <span>›</span></span>
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
                `${category.name} ${category.description || ""} ${(category.tags || []).join(" ")}`.toLowerCase().includes(term)
            );
        renderCategoriesPage(results);
    });
}