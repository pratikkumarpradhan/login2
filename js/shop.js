/* =========================================================
   PROJECTKART
   Shop Page
   ========================================================= */

import { getProducts } from "./products.js";
import { getCategories } from "./categories.js";
import { FALLBACK_PRODUCTS } from "./catalog-data.js";
import { escapeHTML, formatPrice, getQueryParam, showToast } from "./utils.js";
import { addToCart } from "./cart.js";
import { bootPublicPage } from "./page.js";

let allProducts = FALLBACK_PRODUCTS;

document.addEventListener("DOMContentLoaded", () => {
    initShop();
});

export async function initShop() {
    bootPublicPage();
    setupHeaderState();
    setupScrollTop();
    setupNavbarSearch();
    applyUrlState();
    setupFilters();
    applyFilters();

    try {
        await loadCategoryOptions();
        const liveProducts = await getProducts();
        if (Array.isArray(liveProducts) && liveProducts.length) {
            allProducts = liveProducts;
            applyFilters();
        }
    } catch (error) {
        console.error("Shop initialization error:", error);
        allProducts = FALLBACK_PRODUCTS;
        applyFilters();
    } finally {
        bootPublicPage();
    }
}

function setupHeaderState() {
    const header = document.getElementById("siteHeader");
    if (!header) {
        return;
    }

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
}

function setupScrollTop() {
    const button = document.getElementById("scrollTopButton");
    if (!button) {
        return;
    }

    const onScroll = () => button.classList.toggle("is-visible", window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function setupNavbarSearch() {
    const form = document.getElementById("navbarSearch");
    const input = document.getElementById("globalSearchInput");
    const shopSearch = document.getElementById("shopSearch");

    if (!form || !input) {
        return;
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (shopSearch) {
            shopSearch.value = input.value;
            applyFilters();
            return;
        }
        window.location.href = `shop.html?search=${encodeURIComponent(input.value.trim())}`;
    });
}

async function loadCategoryOptions() {
    const select = document.getElementById("shopCategory");
    if (!select) {
        return;
    }

    const categories = await getCategories();
    categories.forEach(category => {
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
        if (input) {
            input.value = search;
        }
    }

    if (category) {
        const select = document.getElementById("shopCategory");
        if (select) {
            select.value = category;
        }
    }

    if (deal === "true" || deal === "1") {
        const sort = document.getElementById("shopSort");
        if (sort) {
            sort.value = "deals";
        }
    }
}

function setupFilters() {
    ["shopSearch", "shopCategory", "shopMaxPrice", "shopInStock", "shopSort"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", applyFilters);
        document.getElementById(id)?.addEventListener("change", applyFilters);
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

    document.getElementById("shopProductGrid")?.addEventListener("click", event => {
        const wishlist = event.target.closest("[data-wishlist]");
        if (wishlist) {
            event.preventDefault();
            wishlist.classList.toggle("is-active");
            return;
        }

        const add = event.target.closest("[data-add-cart]");
        if (!add) {
            return;
        }

        event.preventDefault();
        const id = add.getAttribute("data-add-cart");
        const product = allProducts.find(item => item.id === id);
        if (!product) {
            return;
        }

        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image
        });
        showToast(`${product.name} added to cart`);
    });
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

    updatePriceLabel();
    applyFilters();
}

function updatePriceLabel() {
    const price = document.getElementById("shopMaxPrice");
    const label = document.getElementById("shopMaxPriceValue");
    if (price && label) {
        label.textContent = formatPrice(price.value);
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

    let products = [...allProducts];

    if (dealOnly && sort === "deals") {
        products = products.filter(product => product.deal || product.badge === "SALE");
    } else if (getQueryParam("deal") === "true" && !search && !category) {
        products = products.filter(product => product.deal || product.badge === "SALE");
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
    }

    renderProducts(products);
}

function badgeClass(badge) {
    const value = String(badge || "").toUpperCase();
    if (value === "SALE") return "product-badge product-badge--yellow";
    if (value.includes("LIMITED")) return "product-badge product-badge--red";
    return "product-badge product-badge--blue";
}

function renderProducts(products) {
    const grid = document.getElementById("shopProductGrid");
    const empty = document.getElementById("shopEmpty");
    const shown = document.getElementById("shopShownCount");
    const total = document.getElementById("shopTotalCount");
    const sku = document.getElementById("shopSkuCount");

    if (shown) shown.textContent = String(products.length);
    if (total) total.textContent = String(allProducts.length);
    if (sku) sku.textContent = `${allProducts.length} DEMO SKUS`;

    if (!grid) {
        return;
    }

    if (!products.length) {
        grid.innerHTML = "";
        empty?.classList.add("is-visible");
        return;
    }

    empty?.classList.remove("is-visible");

    grid.innerHTML = products.map(product => {
        const limited = Number(product.stock) > 0 && Number(product.stock) < 10;
        const stockLabel = limited ? `${product.stock} left` : "In stock";
        const stockClass = limited ? "product-stock product-stock--limited" : "product-stock product-stock--available";

        return `
            <article class="product-card" data-product-id="${escapeHTML(product.id)}">
                <div class="product-card__media">
                    <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card__image-link">
                        <img src="${escapeHTML(product.image || "")}" alt="${escapeHTML(product.name)}" class="product-card__image" loading="lazy">
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
                        <button class="product-add-button" type="button" data-add-cart="${escapeHTML(product.id)}" aria-label="Add ${escapeHTML(product.name)} to cart">+</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}
