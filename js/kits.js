/* =========================================================
   PROJECTKART
   Project Kits — Firestore kits + Project Kits page UI
   ========================================================= */

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
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

import {
    createSlug,
    escapeHTML,
    showToast
} from "./utils.js";

import {
    watchUser,
    whenAuthReady
} from "./auth.js";

import {
    isCurrentUserAdmin
} from "./admin-check.js";


const KITS = "kits";


function kitsRef() {
    return collection(db, KITS);
}


function kitDoc(id) {
    return doc(db, KITS, id);
}


function mapKit(document) {
    return {
        id: document.id,
        ...document.data()
    };
}


function parseIncludes(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => String(item || "").trim())
            .filter(Boolean);
    }

    return String(value || "")
        .split(/\n|,/)
        .map(item => item.trim())
        .filter(Boolean);
}


function normalizeKitInput(kit = {}, {
    isCreate = false
} = {}) {
    const name = String(kit.name || "").trim();

    if (!name) {
        throw new Error("Kit name is required.");
    }

    const description = String(kit.description || "").trim();
    if (!description) {
        throw new Error("Kit description is required.");
    }

    const price = Number(kit.price);
    if (!Number.isFinite(price) || price < 0) {
        throw new Error("Please enter a valid price.");
    }

    const image = String(kit.image || "").trim();
    if (isCreate && !image) {
        throw new Error("Please upload a kit image.");
    }

    const difficulty = String(kit.difficulty || "Beginner").trim() || "Beginner";
    const includes = parseIncludes(kit.includes);

    const data = {
        name,
        slug: String(kit.slug || createSlug(name)).trim() || createSlug(name),
        description,
        difficulty,
        category: String(kit.category || "Project Kit").trim() || "Project Kit",
        price,
        oldPrice: Number(kit.oldPrice) > 0 ? Number(kit.oldPrice) : 0,
        image,
        includes,
        badge: String(kit.badge || "").trim(),
        featured: Boolean(kit.featured),
        active: kit.active !== false,
        order: Number.isFinite(Number(kit.order)) ? Number(kit.order) : 0,
        updatedAt: serverTimestamp()
    };

    if (isCreate) {
        data.createdAt = serverTimestamp();
    }

    return data;
}


/*
|--------------------------------------------------------------------------
| Get Active Kits
|--------------------------------------------------------------------------
*/

export async function getKits() {
    try {
        const kitQuery = query(
            kitsRef(),
            where("active", "==", true),
            orderBy("order", "asc")
        );

        const snapshot = await getDocs(kitQuery);

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(mapKit);
    } catch (error) {
        console.error("Unable to load kits from Firebase:", error);
        return FALLBACK_KITS;
    }
}


/*
|--------------------------------------------------------------------------
| Real-time Active Kits
|--------------------------------------------------------------------------
*/

export function watchActiveKits(onData, onError) {
    const kitQuery = query(
        kitsRef(),
        where("active", "==", true),
        orderBy("order", "asc")
    );

    return onSnapshot(
        kitQuery,
        snapshot => {
            onData(snapshot.docs.map(mapKit));
        },
        error => {
            console.error("Kits listener error:", error);
            if (typeof onError === "function") {
                onError(error);
            }
        }
    );
}


/*
|--------------------------------------------------------------------------
| Get Featured Kits
|--------------------------------------------------------------------------
*/

export async function getFeaturedKits(maximum = 6) {
    try {
        const kitQuery = query(
            kitsRef(),
            where("active", "==", true),
            where("featured", "==", true),
            orderBy("order", "asc"),
            limit(maximum)
        );

        const snapshot = await getDocs(kitQuery);

        if (!snapshot.empty) {
            return snapshot.docs.map(mapKit);
        }

        const active = await getKits();
        if (active.length) {
            return active.slice(0, maximum);
        }
    } catch (error) {
        console.error("Unable to load featured kits:", error);
    }

    return FALLBACK_KITS.filter(item => item.featured).slice(0, maximum);
}


/*
|--------------------------------------------------------------------------
| Get Single Kit
|--------------------------------------------------------------------------
*/

export async function getKit(kitId) {
    if (!kitId) {
        return null;
    }

    try {
        const snapshot = await getDoc(kitDoc(kitId));

        if (snapshot.exists()) {
            return mapKit(snapshot);
        }
    } catch (error) {
        console.error("Unable to load kit from Firebase:", error);
    }

    return FALLBACK_KITS.find(item => item.id === kitId) || null;
}


/*
|--------------------------------------------------------------------------
| ADMIN — Get All Kits
|--------------------------------------------------------------------------
*/

export async function getAllKits() {
    const kitQuery = query(
        kitsRef(),
        orderBy("order", "asc")
    );

    const snapshot = await getDocs(kitQuery);

    return snapshot.docs.map(mapKit);
}


/*
|--------------------------------------------------------------------------
| ADMIN — Add Kit
|--------------------------------------------------------------------------
*/

export async function addKit(kit) {
    const data = normalizeKitInput(kit, { isCreate: true });
    const reference = await addDoc(kitsRef(), data);
    return reference.id;
}


/*
|--------------------------------------------------------------------------
| ADMIN — Update Kit
|--------------------------------------------------------------------------
*/

export async function updateKit(kitId, kit) {
    if (!kitId) {
        throw new Error("Kit ID is required.");
    }

    const data = normalizeKitInput(kit, { isCreate: false });
    await updateDoc(kitDoc(kitId), data);
    return true;
}


/*
|--------------------------------------------------------------------------
| ADMIN — Delete Kit
|--------------------------------------------------------------------------
*/

export async function deleteKit(kitId) {
    if (!kitId) {
        throw new Error("Kit ID is required.");
    }

    await deleteDoc(kitDoc(kitId));
    return true;
}


/*
|--------------------------------------------------------------------------
| ADMIN — Show / Hide Kit
|--------------------------------------------------------------------------
*/

export async function setKitActive(kitId, active) {
    await updateDoc(kitDoc(kitId), {
        active: Boolean(active),
        updatedAt: serverTimestamp()
    });

    return true;
}


/*
|--------------------------------------------------------------------------
| Project Kits page
|--------------------------------------------------------------------------
*/

let allKits = [];
let activeDifficulty = "all";
let isAdmin = false;
let unsubscribeKits = null;
let adminCheckSequence = 0;


document.addEventListener("DOMContentLoaded", () => {
    initKitsPage();
});


async function initKitsPage() {
    const grid = document.querySelector("[data-kits-grid], #kitsGrid");

    if (!grid) {
        return;
    }

    setupKitFilters();
    setupNavbarSearch();
    setupAdminVisibility();
    grid.addEventListener("click", handleGridClick);
    renderKitsPage([]);
    startKitsListener();
}


function startKitsListener() {
    if (unsubscribeKits) {
        unsubscribeKits();
    }

    unsubscribeKits = watchActiveKits(
        kits => {
            allKits = Array.isArray(kits) ? kits : [];
            renderKitsPage(filterKits());
        },
        error => {
            console.error("Kits page listener error:", error);
            allKits = FALLBACK_KITS;
            renderKitsPage(filterKits());
            showToast("Showing demo kits while Firebase is unavailable.", "error");
        }
    );
}


function setupAdminVisibility() {
    const applyAdminUi = admin => {
        isAdmin = Boolean(admin);
        document.body.classList.toggle("is-kits-admin", isAdmin);
        document.body.classList.toggle("is-shop-admin", isAdmin);

        document.querySelectorAll("[data-admin-only]").forEach(element => {
            if (isAdmin) {
                element.hidden = false;
                element.removeAttribute("hidden");
                element.classList.add("is-admin-visible");
            } else {
                element.hidden = true;
                element.setAttribute("hidden", "");
                element.classList.remove("is-admin-visible");
            }
        });

        const fab = document.querySelector("[data-kits-admin-fab], #kitsAdminFab");
        if (fab) {
            fab.setAttribute("aria-hidden", isAdmin ? "false" : "true");
        }

        renderKitsPage(filterKits());
    };

    const resolveAdmin = async user => {
        const sequence = ++adminCheckSequence;

        if (!user) {
            if (sequence === adminCheckSequence) {
                applyAdminUi(false);
            }
            return;
        }

        try {
            const allowed = await isCurrentUserAdmin(user);
            if (sequence !== adminCheckSequence) {
                return;
            }
            applyAdminUi(allowed);
        } catch (error) {
            console.error("Kits admin check error:", error);
            if (sequence === adminCheckSequence) {
                applyAdminUi(false);
            }
        }
    };

    whenAuthReady()
        .then(resolveAdmin)
        .catch(error => {
            console.error("Kits auth ready error:", error);
            applyAdminUi(false);
        });

    watchUser(user => {
        resolveAdmin(user);
    });
}


async function handleGridClick(event) {
    const edit = event.target.closest("[data-admin-edit]");
    if (edit) {
        event.preventDefault();
        event.stopPropagation();
        if (!isAdmin) return;
        window.location.href = `admin/kit-edit.html?id=${encodeURIComponent(edit.getAttribute("data-admin-edit"))}`;
        return;
    }

    const remove = event.target.closest("[data-admin-delete]");
    if (remove) {
        event.preventDefault();
        event.stopPropagation();
        if (!isAdmin) return;

        const id = remove.getAttribute("data-admin-delete");
        const kit = allKits.find(item => item.id === id);

        if (!window.confirm(`Delete “${kit?.name || "this kit"}” permanently?`)) {
            return;
        }

        try {
            await deleteKit(id);
            showToast("Kit deleted.", "success");
        } catch (error) {
            console.error("Kits delete error:", error);
            showToast(error.message || "Unable to delete kit.", "error");
        }
    }
}


function setupNavbarSearch() {
    const form = document.getElementById("navbarSearch");
    const input = document.getElementById("globalSearchInput");

    if (!form || !input) {
        return;
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        const queryText = input.value.trim();
        window.location.href = queryText
            ? `shop.html?search=${encodeURIComponent(queryText)}`
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
    const empty = document.getElementById("kitsEmpty");

    if (!grid) {
        return;
    }

    if (count) {
        count.textContent = String(kits.length);
    }

    if (!kits.length) {
        grid.innerHTML = "";
        if (empty) {
            empty.hidden = false;
            empty.removeAttribute("hidden");
        }
        return;
    }

    if (empty) {
        empty.hidden = true;
        empty.setAttribute("hidden", "");
    }

    grid.innerHTML = kits.map(kit => {
        const includes = Array.isArray(kit.includes) ? kit.includes : [];
        const badge = kit.badge || kit.difficulty || "";

        return `
            <article class="project-kit-card" data-kit-id="${escapeHTML(kit.id)}">
                <div class="project-kit-card__media">
                    <img src="${escapeHTML(kit.image || "")}" alt="${escapeHTML(kit.name)}" loading="lazy">
                    ${badge ? `<span class="project-kit-card__badge">${escapeHTML(badge)}</span>` : ""}
                    <div class="project-kit-card__admin-actions" data-admin-only ${isAdmin ? "" : "hidden"}>
                        <button type="button" class="project-kit-card__admin-btn project-kit-card__admin-btn--edit" data-admin-edit="${escapeHTML(kit.id)}" aria-label="Edit ${escapeHTML(kit.name)}">Edit</button>
                        <button type="button" class="project-kit-card__admin-btn project-kit-card__admin-btn--delete" data-admin-delete="${escapeHTML(kit.id)}" aria-label="Delete ${escapeHTML(kit.name)}">Delete</button>
                    </div>
                </div>
                <div class="project-kit-card__body">
                    <span class="project-kit-card__category">${escapeHTML(kit.category || "Project Kit")}</span>
                    <h3>${escapeHTML(kit.name)}</h3>
                    <p class="project-kit-card__text">${escapeHTML(kit.description || "")}</p>
                    <div class="project-kit-card__includes">
                        <span>Includes</span>
                        <ul>
                            ${includes.map(item => `<li>${escapeHTML(item)}</li>`).join("")}
                        </ul>
                    </div>
                    <div class="project-kit-card__bottom">
                        <div class="project-kit-card__price">
                            <strong>₹${Number(kit.price || 0).toLocaleString("en-IN")}</strong>
                            ${Number(kit.oldPrice) > Number(kit.price) ? `<del>₹${Number(kit.oldPrice).toLocaleString("en-IN")}</del>` : ""}
                        </div>
                        <a class="project-kit-card__link" href="product.html?id=${encodeURIComponent(kit.id)}">View kit →</a>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    document.querySelectorAll("#kitsGrid [data-admin-only], [data-kits-grid] [data-admin-only]").forEach(element => {
        if (isAdmin) {
            element.hidden = false;
            element.removeAttribute("hidden");
            element.classList.add("is-admin-visible");
        } else {
            element.hidden = true;
            element.setAttribute("hidden", "");
            element.classList.remove("is-admin-visible");
        }
    });
}
