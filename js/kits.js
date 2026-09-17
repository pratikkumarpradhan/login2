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

import {
    FALLBACK_KITS
} from "./catalog-data.js";


const KITS = "kits";


/*
|--------------------------------------------------------------------------
| Get Active Kits
|--------------------------------------------------------------------------
*/

export async function getKits() {

    try {

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

        if (snapshot.empty) {
            return FALLBACK_KITS;
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
            "Unable to load kits from Firebase:",
            error
        );

        return FALLBACK_KITS;
    }
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


document.addEventListener("DOMContentLoaded", () => {
    initKitsPage();
});


let allKits = FALLBACK_KITS;
let activeDifficulty = "all";


async function initKitsPage() {
    const grid = document.querySelector("[data-kits-grid], #kitsGrid");

    if (!grid) {
        return;
    }

    setupKitFilters();
    setupNavbarSearch();
    renderKitsPage(allKits);

    try {
        const kits = await getKits();
        if (Array.isArray(kits) && kits.length) {
            allKits = kits;
        }
    } catch (error) {
        console.error("Kits page error:", error);
        allKits = FALLBACK_KITS;
    }

    renderKitsPage(filterKits());
}


function setupNavbarSearch() {
    const form = document.getElementById("navbarSearch");
    const input = document.getElementById("globalSearchInput");

    if (!form || !input) {
        return;
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        const query = input.value.trim();
        window.location.href = query
            ? `shop.html?search=${encodeURIComponent(query)}`
            : "shop.html";
    });
}


function setupKitFilters() {
    document.querySelectorAll("[data-kit-filter]").forEach(button => {
        button.addEventListener("click", () => {
            activeDifficulty = button.dataset.kitFilter || "all";
            document.querySelectorAll("[data-kit-filter]").forEach(item => {
                item.classList.toggle("is-active", item === button);
            });
            renderKitsPage(filterKits());
        });
    });
}


function filterKits() {
    if (activeDifficulty === "all") {
        return allKits;
    }

    return allKits.filter(kit =>
        String(kit.difficulty || "").toLowerCase() === activeDifficulty.toLowerCase()
    );
}


function renderKitsPage(kits) {
    const grid = document.querySelector("[data-kits-grid], #kitsGrid");
    const count = document.getElementById("kitsCount");

    if (!grid) {
        return;
    }

    if (count) {
        count.textContent = String(kits.length);
    }

    grid.innerHTML = kits.map(kit => {
        const includes = Array.isArray(kit.includes) ? kit.includes : [];

        return `
            <article class="project-kit-card">
                <div class="project-kit-card__media">
                    <img src="${kit.image || ""}" alt="${kit.name}" loading="lazy">
                    <span class="project-kit-card__badge">${kit.difficulty || ""}</span>
                </div>
                <div class="project-kit-card__body">
                    <span class="project-kit-card__category">${kit.category || "Project Kit"}</span>
                    <h3>${kit.name}</h3>
                    <p class="project-kit-card__text">${kit.description || ""}</p>
                    <div class="project-kit-card__includes">
                        <span>Includes</span>
                        <ul>
                            ${includes.map(item => `<li>${item}</li>`).join("")}
                        </ul>
                    </div>
                    <div class="project-kit-card__bottom">
                        <strong class="project-kit-card__price">₹${Number(kit.price).toLocaleString("en-IN")}</strong>
                        <a class="project-kit-card__link" href="product.html?id=${encodeURIComponent(kit.id)}">View kit →</a>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}