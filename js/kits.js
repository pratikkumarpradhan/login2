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


async function initKitsPage() {
    const grid = document.querySelector("[data-kits-grid]");

    if (!grid) {
        return;
    }

    const loading = document.querySelector("[data-kits-loading]");
    const empty = document.querySelector("[data-kits-empty]");

    try {
        const kits = await getKits();
        renderKitsPage(kits);
    } catch (error) {
        console.error("Kits page error:", error);
        renderKitsPage(FALLBACK_KITS);
    } finally {
        if (loading) {
            loading.hidden = true;
            loading.style.display = "none";
        }
        if (empty) {
            empty.hidden = Boolean(grid.children.length);
        }
    }
}


function renderKitsPage(kits) {
    const grid = document.querySelector("[data-kits-grid]");

    if (!grid) {
        return;
    }

    grid.innerHTML = kits.map(kit => `
        <a href="project-kits.html?kit=${encodeURIComponent(kit.id)}" class="kit-card">
            <div class="kit-card__image">
                <img src="${kit.image || ""}" alt="${kit.name}" loading="lazy">
            </div>
            <div class="kit-card__overlay"></div>
            <div class="kit-card__content">
                <span class="kit-card__difficulty">${(kit.difficulty || "").toUpperCase()}</span>
                <h3>${kit.name}</h3>
                <span class="kit-card__link">View kit →</span>
            </div>
        </a>
    `).join("");
}