/* =========================================================
   PROJECTKART
   Homepage — static Explore Components cards + live featured
   components and kits
   ========================================================= */

import { addToCart, initCart, updateCartCount } from "./cart.js";
import { escapeHTML, formatPrice, showToast } from "./utils.js";
import { watchFeaturedComponents } from "./products.js";
import { watchFeaturedKits } from "./kits.js";
import { FALLBACK_PRODUCTS, FALLBACK_KITS } from "./catalog-data.js";

const HOME_PRODUCT_LIMIT = 8;
const HOME_KIT_LIMIT = 3;
const PLACEHOLDER_IMAGE = "assets/images/hero/hero-workspace.jpg";

let featuredProducts = [];
let unsubProducts = null;
let unsubKits = null;

document.addEventListener("DOMContentLoaded", () => {
    initHome();
});

export function initHome() {
    initCart();
    hidePageLoader();
    setupHeaderState();
    setupHeroScrollCue();
    setupScrollTop();
    setupNavbarSearch();
    setupHomeInteractions();
    updateCartCount();
    startHomeListeners();
}

function startHomeListeners() {
    // Explore Components cards are permanent HTML — do not load from Firestore.
    renderProductSkeletons();
    renderKitSkeletons();

    if (unsubProducts) unsubProducts();
    if (unsubKits) unsubKits();

    unsubProducts = watchFeaturedComponents(
        products => {
            featuredProducts = Array.isArray(products) ? products : [];
            renderHomeProducts(featuredProducts);
        },
        error => {
            console.error("Home featured components error:", error);
            featuredProducts = FALLBACK_PRODUCTS
                .filter(item => item.featured && item.active !== false)
                .slice(0, HOME_PRODUCT_LIMIT);
            renderHomeProducts(featuredProducts);
            showToast("Showing demo components while Firebase is unavailable.", "error");
        },
        HOME_PRODUCT_LIMIT
    );

    unsubKits = watchFeaturedKits(
        kits => {
            renderHomeKits(Array.isArray(kits) ? kits : []);
        },
        error => {
            console.error("Home featured kits error:", error);
            renderHomeKits(
                FALLBACK_KITS.filter(item => item.featured && item.active !== false).slice(0, HOME_KIT_LIMIT)
            );
            showToast("Showing demo kits while Firebase is unavailable.", "error");
        },
        HOME_KIT_LIMIT
    );
}

function setupHomeInteractions() {
    const productsGrid = document.getElementById("popularProductsGrid");
    productsGrid?.addEventListener("click", handleProductsGridClick);
}

function handleProductsGridClick(event) {
    const wishlist = event.target.closest("[data-wishlist]");
    if (wishlist) {
        event.preventDefault();
        event.stopPropagation();
        wishlist.classList.toggle("is-active");
        return;
    }

    const add = event.target.closest("[data-add-cart]");
    if (add) {
        event.preventDefault();
        event.stopPropagation();

        const id = add.getAttribute("data-add-cart");
        const product = featuredProducts.find(item => item.id === id);
        if (!product) {
            return;
        }

        if (Number(product.stock) <= 0) {
            showToast("This component is out of stock.", "error");
            return;
        }

        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            stock: product.stock,
            category: product.categoryName || product.categoryId || ""
        });
        showToast(`${product.name} added to cart`);
        return;
    }

    const card = event.target.closest(".product-card[data-product-id]");
    if (card && !event.target.closest("a, button")) {
        const id = card.getAttribute("data-product-id");
        if (id) {
            window.location.href = `product.html?id=${encodeURIComponent(id)}`;
        }
    }
}

function renderHomeProducts(products) {
    const grid = document.getElementById("popularProductsGrid");
    const empty = document.getElementById("homeProductsEmpty");
    if (!grid) {
        return;
    }

    if (!products.length) {
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
                        <img src="${escapeHTML(product.image || PLACEHOLDER_IMAGE)}" alt="${escapeHTML(product.name)}" class="product-card__image" loading="lazy">
                    </a>
                    ${product.badge ? `<span class="${badgeClass(product.badge)}">${escapeHTML(product.badge)}</span>` : ""}
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
}

function renderHomeKits(kits) {
    const showcase = document.getElementById("homeKitsShowcase");
    if (!showcase) {
        return;
    }

    if (!kits.length) {
        showcase.innerHTML = `
            <div class="home-section-empty home-section-empty--kits" id="homeKitsEmpty">
                <h3>No featured project kits available yet.</h3>
                <p>Kits marked as featured by an admin will appear here.</p>
            </div>
        `;
        showcase.classList.add("is-empty");
        return;
    }

    showcase.classList.remove("is-empty");
    showcase.innerHTML = kits.map((kit, index) => {
        const difficulty = String(kit.difficulty || "").toUpperCase();
        const sizeClass = index === 0 ? " kit-card--large" : "";
        const image = kit.image || PLACEHOLDER_IMAGE;

        return `
            <a href="project-kits.html?kit=${encodeURIComponent(kit.id)}" class="kit-card${sizeClass}">
                <div class="kit-card__image">
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(kit.name || "Project kit")}" loading="lazy">
                </div>
                <div class="kit-card__overlay"></div>
                <div class="kit-card__content">
                    ${difficulty ? `<span class="kit-card__difficulty">${escapeHTML(difficulty)}</span>` : ""}
                    <h3>${escapeHTML(kit.name || "Project kit")}</h3>
                    <span class="kit-card__link">View kit →</span>
                </div>
            </a>
        `;
    }).join("");
}

function renderProductSkeletons() {
    const grid = document.getElementById("popularProductsGrid");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 4 }).map(() => `
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

function renderKitSkeletons() {
    const showcase = document.getElementById("homeKitsShowcase");
    if (!showcase) return;
    showcase.classList.remove("is-empty");
    showcase.innerHTML = `
        <div class="kit-card kit-card--large home-card-skeleton" aria-hidden="true"></div>
        <div class="kit-card home-card-skeleton" aria-hidden="true"></div>
        <div class="kit-card home-card-skeleton" aria-hidden="true"></div>
    `;
}

function badgeClass(badge) {
    const value = String(badge || "").toLowerCase();
    if (value.includes("sale") || value.includes("deal")) return "product-badge product-badge--sale";
    if (value.includes("new")) return "product-badge product-badge--new";
    if (value.includes("popular") || value.includes("featured")) return "product-badge product-badge--blue";
    return "product-badge";
}

function hidePageLoader() {
    const loader = document.getElementById("pageLoader");

    window.setTimeout(() => {
        if (!loader) {
            return;
        }

        loader.classList.add("is-hidden");
        loader.setAttribute("aria-hidden", "true");
    }, 450);
}

function setupHeaderState() {
    const header = document.getElementById("siteHeader");

    if (!header) {
        return;
    }

    const onScroll = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
}

function setupHeroScrollCue() {
    const cue = document.getElementById("heroScrollCue");
    const next = document.getElementById("exploreComponents");

    if (!cue) {
        return;
    }

    cue.addEventListener("click", () => {
        (next || document.getElementById("mainContent"))?.scrollIntoView({
            behavior: "smooth"
        });
    });
}

function setupScrollTop() {
    const button = document.getElementById("scrollTopButton");

    if (!button) {
        return;
    }

    const onScroll = () => {
        button.classList.toggle("is-visible", window.scrollY > 480);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
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

        if (!query) {
            window.location.href = "shop.html";
            return;
        }

        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
    });
}
