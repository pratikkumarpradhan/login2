/* =========================================================
   PROJECTKART
   Shop Page — live Firestore components + admin controls
   ========================================================= */

import {
    watchActiveComponents,
    deleteComponent
} from "./components.js";
import { getCategories } from "./categories.js";
import { FALLBACK_PRODUCTS } from "./catalog-data.js";
import { escapeHTML, formatPrice, getQueryParam, showToast } from "./utils.js";
import { addToCart } from "./cart.js";
import { bootPublicPage } from "./page.js";
import { watchUser, whenAuthReady } from "./auth.js";
import { isCurrentUserAdmin } from "./admin-check.js";

let allProducts = [];
let isAdmin = false;
let unsubscribeComponents = null;
let hasLiveData = false;
let adminCheckSequence = 0;

document.addEventListener("DOMContentLoaded", () => {
    initShop();
});

export async function initShop() {
    bootPublicPage();
    setupHeaderState();
    setupScrollTop();
    setupNavbarSearch();
    setupFilters();
    showLoadingState(true);

    try {
        await loadCategoryOptions();
        applyUrlState();
        setupAdminVisibility();
        startComponentsListener();
    } catch (error) {
        console.error("Shop initialization error:", error);
        allProducts = FALLBACK_PRODUCTS;
        applyFilters();
        showToast("Showing demo catalogue while Firebase is unavailable.", "error");
    } finally {
        showLoadingState(false);
        bootPublicPage();
    }
}

function setupAdminVisibility() {
    const applyAdminUi = admin => {
        isAdmin = Boolean(admin);
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

        const fab = document.querySelector("[data-shop-admin-fab], #shopAdminFab");
        if (fab) {
            fab.setAttribute("aria-hidden", isAdmin ? "false" : "true");
        }

        console.info("[ProjectKart] shop admin UI", { isAdmin });
        applyFilters();
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
            console.error("Shop admin check error:", error);
            if (sequence === adminCheckSequence) {
                applyAdminUi(false);
            }
        }
    };

    // Wait for first auth restoration, then keep listening.
    whenAuthReady()
        .then(resolveAdmin)
        .catch(error => {
            console.error("Shop auth ready error:", error);
            applyAdminUi(false);
        });

    watchUser(user => {
        resolveAdmin(user);
    });
}

function startComponentsListener() {
    if (unsubscribeComponents) {
        unsubscribeComponents();
    }

    unsubscribeComponents = watchActiveComponents(
        components => {
            hasLiveData = true;
            allProducts = Array.isArray(components) ? components : [];
            showLoadingState(false);
            applyFilters();
            updateSkuLabel();
        },
        error => {
            console.error("Shop components listener error:", error);
            if (!hasLiveData) {
                allProducts = FALLBACK_PRODUCTS;
                applyFilters();
            }
            showLoadingState(false);
            if (error?.code === "failed-precondition") {
                showToast("A Firestore index is required for the shop catalogue.", "error");
            } else if (error?.code === "permission-denied") {
                showToast("Unable to load components (permission denied).", "error");
            }
        }
    );
}

function setupHeaderState() {
    const header = document.getElementById("siteHeader");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
}

function setupScrollTop() {
    const button = document.getElementById("scrollTopButton");
    if (!button) return;
    const onScroll = () => button.classList.toggle("is-visible", window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function setupNavbarSearch() {
    const form = document.getElementById("navbarSearch");
    const input = document.getElementById("globalSearchInput");
    const shopSearch = document.getElementById("shopSearch");

    if (!form || !input) return;

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (shopSearch) {
            shopSearch.value = input.value;
            syncUrlState();
            applyFilters();
            return;
        }
        window.location.href = `shop.html?search=${encodeURIComponent(input.value.trim())}`;
    });
}

async function loadCategoryOptions() {
    const select = document.getElementById("shopCategory");
    if (!select) return;

    const categories = await getCategories();
    const existing = new Set([...select.options].map(option => option.value));

    categories.forEach(category => {
        if (existing.has(category.id)) return;
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

function applyUrlState() {
    const search = getQueryParam("search");
    const category = getQueryParam("category");
    const deal = getQueryParam("deal");

    if (search) {
        const input = document.getElementById("shopSearch");
        if (input) input.value = search;
        const nav = document.getElementById("globalSearchInput");
        if (nav) nav.value = search;
    }

    if (category) {
        const select = document.getElementById("shopCategory");
        if (select) select.value = category;
    }

    if (deal === "true" || deal === "1") {
        const sort = document.getElementById("shopSort");
        if (sort) sort.value = "deals";
    }

    updateActiveCategoryChip();
}

function setupFilters() {
    ["shopSearch", "shopCategory", "shopMaxPrice", "shopInStock", "shopSort"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", () => {
            syncUrlState();
            applyFilters();
        });
        document.getElementById(id)?.addEventListener("change", () => {
            syncUrlState();
            applyFilters();
        });
    });

    document.getElementById("shopMaxPrice")?.addEventListener("input", updatePriceLabel);
    document.getElementById("shopClear")?.addEventListener("click", clearFilters);

    document.querySelectorAll("[data-shop-view]").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-shop-view]").forEach(item => item.classList.remove("is-active"));
            button.classList.add("is-active");
            document.getElementById("shopProductGrid")?.classList.toggle("is-list", button.dataset.shopView === "list");
        });
    });

    document.getElementById("shopProductGrid")?.addEventListener("click", handleGridClick);
}

async function handleGridClick(event) {
    const edit = event.target.closest("[data-admin-edit]");
    if (edit) {
        event.preventDefault();
        event.stopPropagation();
        if (!isAdmin) return;
        window.location.href = `admin/product-edit.html?id=${encodeURIComponent(edit.getAttribute("data-admin-edit"))}`;
        return;
    }

    const remove = event.target.closest("[data-admin-delete]");
    if (remove) {
        event.preventDefault();
        event.stopPropagation();
        if (!isAdmin) return;
        const id = remove.getAttribute("data-admin-delete");
        const product = allProducts.find(item => item.id === id);
        if (!window.confirm(`Delete “${product?.name || "this component"}” permanently?`)) {
            return;
        }
        try {
            await deleteComponent(id);
            showToast("Component deleted.", "success");
        } catch (error) {
            console.error("Shop delete error:", error);
            showToast(error.message || "Unable to delete component.", "error");
        }
        return;
    }

    const wishlist = event.target.closest("[data-wishlist]");
    if (wishlist) {
        event.preventDefault();
        wishlist.classList.toggle("is-active");
        return;
    }

    const add = event.target.closest("[data-add-cart]");
    if (!add) return;

    event.preventDefault();
    const id = add.getAttribute("data-add-cart");
    const product = allProducts.find(item => item.id === id);
    if (!product) return;

    addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
        category: product.categoryName || product.categoryId || ""
    });
    showToast(`${product.name} added to cart`);
}

function clearFilters() {
    const search = document.getElementById("shopSearch");
    const category = document.getElementById("shopCategory");
    const price = document.getElementById("shopMaxPrice");
    const stock = document.getElementById("shopInStock");
    const sort = document.getElementById("shopSort");

    if (search) search.value = "";
    if (category) category.value = "";
    if (price) price.value = price.max || "2800";
    if (stock) stock.checked = false;
    if (sort) sort.value = "featured";

    syncUrlState();
    updatePriceLabel();
    applyFilters();
}

function syncUrlState() {
    const params = new URLSearchParams();
    const search = document.getElementById("shopSearch")?.value.trim() || "";
    const category = document.getElementById("shopCategory")?.value || "";
    const sort = document.getElementById("shopSort")?.value || "";

    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (sort === "deals") params.set("deal", "true");

    const query = params.toString();
    const next = query ? `shop.html?${query}` : "shop.html";
    window.history.replaceState({}, "", next);
    updateActiveCategoryChip();
}

function updateActiveCategoryChip() {
    const category = document.getElementById("shopCategory")?.value || "";
    const chip = document.getElementById("shopActiveCategory");
    const select = document.getElementById("shopCategory");
    const label = select?.selectedOptions?.[0]?.textContent || "";

    if (!chip) return;

    if (category) {
        chip.hidden = false;
        chip.textContent = `Category: ${label}`;
    } else {
        chip.hidden = true;
        chip.textContent = "";
    }
}

function updatePriceLabel() {
    const price = document.getElementById("shopMaxPrice");
    const label = document.getElementById("shopMaxPriceValue");
    if (price && label) {
        label.textContent = formatPrice(price.value);
    }
}

function updateSkuLabel() {
    const sku = document.getElementById("shopSkuCount");
    if (sku) {
        sku.textContent = `${allProducts.length} ${allProducts.length === 1 ? "COMPONENT" : "COMPONENTS"}`;
    }
}

function applyFilters() {
    const search = (document.getElementById("shopSearch")?.value || "").toLowerCase().trim();
    const category = document.getElementById("shopCategory")?.value || "";
    const maxPrice = Number(document.getElementById("shopMaxPrice")?.value || 2800);
    const inStock = Boolean(document.getElementById("shopInStock")?.checked);
    const sort = document.getElementById("shopSort")?.value || "featured";
    const dealOnly = getQueryParam("deal") === "true" || sort === "deals";

    updatePriceLabel();
    updateActiveCategoryChip();

    let products = [...allProducts];

    if (dealOnly && sort === "deals") {
        products = products.filter(product => product.deal || String(product.badge || "").toUpperCase() === "SALE");
    } else if (getQueryParam("deal") === "true" && !search && !category) {
        products = products.filter(product => product.deal || String(product.badge || "").toUpperCase() === "SALE");
    }

    if (search) {
        products = products.filter(product =>
            `${product.name} ${product.description} ${product.categoryName}`.toLowerCase().includes(search)
        );
    }

    if (category) {
        products = products.filter(product => product.categoryId === category);
    }

    products = products.filter(product => Number(product.price) <= maxPrice);

    if (inStock) {
        products = products.filter(product => Number(product.stock) > 0);
    }

    if (sort === "price-low") {
        products.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "price-high") {
        products.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === "name") {
        products.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    } else if (sort === "featured") {
        products.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }

    renderProducts(products, { search, category });
}

function badgeClass(badge) {
    const value = String(badge || "").toUpperCase();
    if (value === "SALE") return "product-badge product-badge--yellow";
    if (value.includes("LIMITED")) return "product-badge product-badge--red";
    return "product-badge product-badge--blue";
}

function emptyMessage({ search, category }) {
    if (search && category) {
        return {
            title: "No components match your search.",
            text: "Try another keyword or clear the category filter."
        };
    }
    if (search) {
        return {
            title: "No components match your search.",
            text: "Try another keyword or clear your filters."
        };
    }
    if (category) {
        return {
            title: "No components found in this category.",
            text: "Try another category or browse the full catalogue."
        };
    }
    return {
        title: "No components available yet.",
        text: "New components will appear here once they are published."
    };
}

function renderProducts(products, meta = {}) {
    const grid = document.getElementById("shopProductGrid");
    const empty = document.getElementById("shopEmpty");
    const shown = document.getElementById("shopShownCount");
    const total = document.getElementById("shopTotalCount");

    if (shown) shown.textContent = String(products.length);
    if (total) total.textContent = String(allProducts.length);
    updateSkuLabel();

    if (!grid) return;

    if (!products.length) {
        grid.innerHTML = "";
        const message = emptyMessage(meta);
        if (empty) {
            empty.classList.add("is-visible");
            empty.innerHTML = `<h3>${escapeHTML(message.title)}</h3><p>${escapeHTML(message.text)}</p>`;
        }
        return;
    }

    empty?.classList.remove("is-visible");

    grid.innerHTML = products.map(product => {
        const limited = Number(product.stock) > 0 && Number(product.stock) < 10;
        const out = Number(product.stock) <= 0;
        const stockLabel = out ? "Out of stock" : limited ? `${product.stock} left` : "In stock";
        const stockClass = out
            ? "product-stock product-stock--out"
            : limited
                ? "product-stock product-stock--limited"
                : "product-stock product-stock--available";

        return `
            <article class="product-card" data-product-id="${escapeHTML(product.id)}">
                <div class="product-card__media">
                    <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card__image-link">
                        <img src="${escapeHTML(product.image || "")}" alt="${escapeHTML(product.name)}" class="product-card__image" loading="lazy">
                    </a>
                    ${product.badge ? `<span class="${badgeClass(product.badge)}">${escapeHTML(product.badge)}</span>` : ""}
                    <div class="product-card__admin-actions" data-admin-only ${isAdmin ? "" : "hidden"}>
                        <button type="button" class="product-card__admin-btn product-card__admin-btn--edit" data-admin-edit="${escapeHTML(product.id)}" aria-label="Edit ${escapeHTML(product.name)}">Edit</button>
                        <button type="button" class="product-card__admin-btn product-card__admin-btn--delete" data-admin-delete="${escapeHTML(product.id)}" aria-label="Delete ${escapeHTML(product.name)}">Delete</button>
                    </div>
                    <button class="product-card__wishlist" type="button" data-wishlist="${escapeHTML(product.id)}" aria-label="Add ${escapeHTML(product.name)} to wishlist">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.6 4.6 0 0 1 12 6.1a4.6 4.6 0 0 1 8.8 2.7Z"></path></svg>
                    </button>
                    <span class="product-card__quick-arrow">↗</span>
                </div>
                <div class="product-card__body">
                    <div class="product-card__topline">
                        <span class="product-card__category">${escapeHTML((product.categoryName || "Components").toUpperCase())}</span>
                        <span class="${stockClass}"><span></span> ${stockLabel}</span>
                    </div>
                    <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card__title">${escapeHTML(product.name)}</a>
                    <p class="product-card__description">${escapeHTML(product.description || "")}</p>
                    <div class="product-card__bottom">
                        <div class="product-price">
                            <strong>${formatPrice(product.price)}</strong>
                            ${Number(product.oldPrice) > Number(product.price) ? `<del>${formatPrice(product.oldPrice)}</del>` : ""}
                        </div>
                        <button class="product-add-button" type="button" data-add-cart="${escapeHTML(product.id)}" aria-label="Add ${escapeHTML(product.name)} to cart" ${out ? "disabled" : ""}>+</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    document.querySelectorAll("#shopProductGrid [data-admin-only]").forEach(element => {
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

function showLoadingState(isLoading) {
    const grid = document.getElementById("shopProductGrid");
    if (!grid || !isLoading) return;
    grid.innerHTML = Array.from({ length: 8 }).map(() => `
        <article class="product-card product-card--skeleton" aria-hidden="true">
            <div class="product-card__media"></div>
            <div class="product-card__body">
                <div class="shop-skeleton-line"></div>
                <div class="shop-skeleton-line shop-skeleton-line--title"></div>
                <div class="shop-skeleton-line"></div>
            </div>
        </article>
    `).join("");
}
