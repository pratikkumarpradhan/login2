/* =========================================================
   PROJECTKART
   Product Details Page — live Firestore component detail
   ========================================================= */

import {
    getProduct,
    getProductsByCategory
} from "./products.js";

import {
    addToCart,
    initCart,
    updateCartCount
} from "./cart.js";

import {
    getQueryParam,
    escapeHTML,
    formatPrice,
    showToast
} from "./utils.js";

import {
    bootPublicPage
} from "./page.js";

import {
    buildSingleProductWhatsAppMessage,
    openWhatsAppOrder
} from "./whatsapp.js";

let currentProduct = null;

document.addEventListener("DOMContentLoaded", () => {
    initProductPage();
});

export async function initProductPage() {
    bootPublicPage();
    initCart();
    updateCartCount();
    setupChrome();

    const productId = getQueryParam("id");

    if (!productId) {
        showNotFound();
        return;
    }

    try {
        const product = await getProduct(productId);

        if (!product || !product.name || product.active === false) {
            showNotFound();
            return;
        }

        currentProduct = product;
        document.title = `${product.name} — ProjectKart`;
        hydrateProduct(product);
        setupPurchaseControls(product);
        setupTabs();
        setupGallery(product);
        await loadRelatedProducts(product);
        bootPublicPage();
    } catch (error) {
        console.error("Product loading error:", error);
        showNotFound();
    }
}

function setupChrome() {
    const header = document.getElementById("siteHeader");
    const onScroll = () => {
        header?.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    document.getElementById("scrollTopButton")?.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const form = document.getElementById("navbarSearch");
    const input = document.getElementById("globalSearchInput");
    form?.addEventListener("submit", event => {
        event.preventDefault();
        const query = input?.value.trim();
        window.location.href = query
            ? `shop.html?search=${encodeURIComponent(query)}`
            : "shop.html";
    });
}

function hydrateProduct(product) {
    const categoryLabel = buildCategoryLabel(product);
    const inStock = Number(product.stock) > 0;
    const limited = inStock && Number(product.stock) < 10;
    const oldPrice = Number(product.oldPrice) || 0;
    const price = Number(product.price) || 0;
    const hasDiscount = oldPrice > price;
    const discountPercent = hasDiscount
        ? Math.round(((oldPrice - price) / oldPrice) * 100)
        : 0;

    setText("productName", product.name);
    setText("productDescription", product.description || "No description available.");
    setText("productLongDescription", product.description || "No description available.");
    setText("productBreadcrumbName", product.name);
    setText("productCategory", categoryLabel);
    setText("productPrice", formatPrice(price));

    const categoryCrumb = document.getElementById("productCategoryBreadcrumb");
    if (categoryCrumb) {
        categoryCrumb.textContent = product.categoryName || "Components";
        categoryCrumb.href = product.categoryId
            ? `shop.html?category=${encodeURIComponent(product.categoryId)}`
            : "shop.html";
    }

    const image = document.getElementById("productMainImage");
    if (image) {
        image.src = product.image || "assets/images/placeholders/product-placeholder.jpg";
        image.alt = product.name;
    }

    const zoomImage = document.getElementById("productZoomImage");
    if (zoomImage) {
        zoomImage.src = product.image || "";
        zoomImage.alt = product.name;
    }

    const oldPriceEl = document.getElementById("productOldPrice");
    if (oldPriceEl) {
        if (hasDiscount) {
            oldPriceEl.textContent = formatPrice(oldPrice);
            oldPriceEl.hidden = false;
            oldPriceEl.removeAttribute("hidden");
        } else {
            oldPriceEl.hidden = true;
            oldPriceEl.setAttribute("hidden", "");
        }
    }

    const saveEl = document.getElementById("productSave");
    if (saveEl) {
        if (hasDiscount && discountPercent > 0) {
            saveEl.textContent = `${discountPercent}% OFF`;
            saveEl.hidden = false;
            saveEl.removeAttribute("hidden");
        } else {
            saveEl.hidden = true;
            saveEl.setAttribute("hidden", "");
        }
    }

    const badge = document.getElementById("productBadge");
    if (badge) {
        if (product.badge) {
            badge.textContent = String(product.badge).toUpperCase();
            badge.hidden = false;
            badge.removeAttribute("hidden");
        } else {
            badge.hidden = true;
            badge.setAttribute("hidden", "");
        }
    }

    const stock = document.getElementById("productStock");
    if (stock) {
        stock.classList.toggle("is-out", !inStock);
        stock.classList.toggle("is-low", limited);
        const label = stock.querySelector("span:last-child") || stock;
        if (label) {
            label.textContent = !inStock
                ? "Out of stock"
                : limited
                    ? `${product.stock} left`
                    : "In stock";
        }
    }

    const stockMessage = document.getElementById("productStockMessage");
    if (stockMessage) {
        const message = stockMessage.querySelector("span:last-child") || stockMessage;
        if (!inStock) {
            message.textContent = "Currently unavailable";
            stockMessage.classList.add("is-out");
        } else if (limited) {
            message.textContent = `Only ${product.stock} left — order soon`;
            stockMessage.classList.remove("is-out");
        } else {
            message.textContent = "In stock and ready to order";
            stockMessage.classList.remove("is-out");
        }
    }

    setText("specCategory", product.categoryName || "Components");
    setText("specAvailability", inStock ? "In stock" : "Out of stock");
    setText("specProductId", product.id);
    setText("specStock", String(Number(product.stock) || 0));
    setText("productSku", `SKU ${product.sku || buildSku(product)}`);

    const quantity = document.getElementById("productQuantity");
    if (quantity) {
        quantity.max = String(Math.max(1, Number(product.stock) || 1));
        quantity.value = "1";
        quantity.disabled = !inStock;
    }

    const addButton = document.getElementById("addToCartButton");
    if (addButton) {
        addButton.disabled = !inStock;
        addButton.classList.toggle("is-disabled", !inStock);
    }

    const buyNowButton = document.getElementById("buyNowButton");
    if (buyNowButton) {
        buyNowButton.disabled = !inStock;
        buyNowButton.classList.toggle("is-disabled", !inStock);
    }

    renderThumbnails(product);
}

function buildCategoryLabel(product) {
    const name = String(product.categoryName || "Components").trim();
    const id = String(product.categoryId || "").trim();
    if (name && id && name.toLowerCase() !== id.toLowerCase()) {
        return `${name} / ${id.replaceAll("-", " ")}`.toUpperCase();
    }
    return name.toUpperCase() || "COMPONENTS";
}

function buildSku(product) {
    const slug = String(product.slug || product.name || "ITEM")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 18);
    return `PK-${slug || "ITEM"}`;
}

function renderThumbnails(product) {
    const thumbs = document.getElementById("productThumbnails");
    if (!thumbs) return;

    const images = Array.isArray(product.images) && product.images.length
        ? product.images
        : [product.image || "assets/images/placeholders/product-placeholder.jpg"].filter(Boolean);

    const galleryImages = images.length === 1 ? [images[0], images[0]] : images;

    thumbs.innerHTML = galleryImages.map((src, index) => `
        <button
            type="button"
            class="product-gallery__thumb${index === 0 ? " is-active" : ""}"
            data-image-index="${index}"
            data-image-src="${escapeHTML(src)}"
            aria-label="Product image ${index + 1}"
        >
            <img src="${escapeHTML(src)}" alt="">
        </button>
    `).join("");
}

function setupGallery(product) {
    const mainImage = document.getElementById("productMainImage");
    const thumbs = document.getElementById("productThumbnails");
    const zoomButton = document.getElementById("productImageZoom");
    const modal = document.getElementById("productImageModal");
    const zoomImage = document.getElementById("productZoomImage");
    const closeModal = document.getElementById("productImageModalClose");

    thumbs?.addEventListener("click", event => {
        const thumb = event.target.closest("[data-image-src]");
        if (!thumb || !mainImage) return;

        const src = thumb.getAttribute("data-image-src");
        mainImage.src = src;
        if (zoomImage) zoomImage.src = src;

        thumbs.querySelectorAll(".product-gallery__thumb").forEach(item => {
            item.classList.toggle("is-active", item === thumb);
        });
    });

    const openZoom = () => {
        if (!modal || !mainImage) return;
        if (zoomImage) zoomImage.src = mainImage.src;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    };

    const closeZoom = () => {
        if (!modal) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    };

    zoomButton?.addEventListener("click", openZoom);
    mainImage?.addEventListener("click", openZoom);
    closeModal?.addEventListener("click", closeZoom);
    modal?.querySelector("[data-product-modal-close]")?.addEventListener("click", closeZoom);

    document.getElementById("productWishlist")?.addEventListener("click", event => {
        event.preventDefault();
        event.currentTarget.classList.toggle("is-active");
        showToast(
            event.currentTarget.classList.contains("is-active")
                ? "Saved to wishlist"
                : "Removed from wishlist"
        );
    });
}

function setupPurchaseControls(product) {
    const input = document.getElementById("productQuantity");
    const minus = document.getElementById("quantityMinus");
    const plus = document.getElementById("quantityPlus");
    const addButton = document.getElementById("addToCartButton");
    const buyNowButton = document.getElementById("buyNowButton");
    const whatsapp = document.getElementById("orderWhatsAppButton");
    const max = Math.max(1, Number(product.stock) || 1);

    const readQuantity = () => {
        let value = Number(input?.value || 1);
        if (!Number.isFinite(value)) value = 1;
        value = Math.max(1, Math.min(max, value));
        if (input) input.value = String(value);
        return value;
    };

    const orderOnWhatsApp = () => {
        const quantity = readQuantity();
        const message = buildSingleProductWhatsAppMessage({
            name: product.name,
            quantity,
            unitPrice: product.price
        });
        openWhatsAppOrder(message);
    };

    minus?.addEventListener("click", () => {
        if (!input) return;
        input.value = String(Math.max(1, Number(input.value || 1) - 1));
    });

    plus?.addEventListener("click", () => {
        if (!input) return;
        input.value = String(Math.min(max, Number(input.value || 1) + 1));
    });

    input?.addEventListener("change", readQuantity);

    addButton?.addEventListener("click", () => {
        if (Number(product.stock) <= 0) {
            showToast("This component is out of stock.", "error");
            return;
        }

        try {
            const quantity = readQuantity();
            addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                stock: product.stock,
                category: product.categoryName || product.categoryId || ""
            }, quantity);
            updateCartCount();
            showToast(`${product.name} added to cart`, "success");
        } catch (error) {
            console.error("Add to cart error:", error);
            showToast(error.message || "Unable to add to cart.", "error");
        }
    });

    buyNowButton?.addEventListener("click", () => {
        if (Number(product.stock) <= 0) {
            showToast("This component is out of stock.", "error");
            return;
        }

        try {
            orderOnWhatsApp();
        } catch (error) {
            console.error("Buy now error:", error);
            showToast(error.message || "Unable to place order.", "error");
        }
    });

    whatsapp?.addEventListener("click", () => {
        try {
            orderOnWhatsApp();
        } catch (error) {
            console.error("WhatsApp order error:", error);
            showToast(error.message || "Unable to open WhatsApp.", "error");
        }
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll("[data-tab]");
    const panels = document.querySelectorAll("[data-panel]");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-tab");

            tabs.forEach(item => {
                const active = item === tab;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-selected", active ? "true" : "false");
            });

            panels.forEach(panel => {
                const active = panel.getAttribute("data-panel") === target;
                panel.classList.toggle("is-active", active);
                if (active) {
                    panel.hidden = false;
                    panel.removeAttribute("hidden");
                } else {
                    panel.hidden = true;
                    panel.setAttribute("hidden", "");
                }
            });
        });
    });
}

async function loadRelatedProducts(product) {
    const container = document.getElementById("relatedProducts");
    if (!container) return;

    try {
        let related = [];

        if (product.categoryId) {
            const products = await getProductsByCategory(product.categoryId);
            related = products.filter(item => item.id !== product.id && item.active !== false);
        }

        if (!related.length) {
            container.innerHTML = `
                <div class="home-section-empty" style="grid-column: 1 / -1;">
                    <h3>No related components yet.</h3>
                    <p><a href="shop.html">Browse the full catalogue →</a></p>
                </div>
            `;
            return;
        }

        container.innerHTML = related.slice(0, 4).map(item => {
            const limited = Number(item.stock) > 0 && Number(item.stock) < 10;
            const out = Number(item.stock) <= 0;
            const stockLabel = out ? "Out of stock" : limited ? `${item.stock} left` : "In stock";
            const stockClass = out
                ? "product-stock product-stock--out"
                : limited
                    ? "product-stock product-stock--limited"
                    : "product-stock product-stock--available";

            return `
                <article class="product-card" data-product-id="${escapeHTML(item.id)}">
                    <div class="product-card__media">
                        <a href="product.html?id=${encodeURIComponent(item.id)}" class="product-card__image-link">
                            <img src="${escapeHTML(item.image || "")}" alt="${escapeHTML(item.name)}" class="product-card__image" loading="lazy">
                        </a>
                        ${item.badge ? `<span class="product-badge product-badge--blue">${escapeHTML(item.badge)}</span>` : ""}
                        <button class="product-card__wishlist" type="button" data-wishlist="${escapeHTML(item.id)}" aria-label="Add ${escapeHTML(item.name)} to wishlist">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.6 4.6 0 0 1 12 6.1a4.6 4.6 0 0 1 8.8 2.7Z"></path></svg>
                        </button>
                        <span class="product-card__quick-arrow">↗</span>
                    </div>
                    <div class="product-card__body">
                        <div class="product-card__topline">
                            <span class="product-card__category">${escapeHTML((item.categoryName || "Components").toUpperCase())}</span>
                            <span class="${stockClass}"><span></span> ${stockLabel}</span>
                        </div>
                        <a href="product.html?id=${encodeURIComponent(item.id)}" class="product-card__title">${escapeHTML(item.name)}</a>
                        <p class="product-card__description">${escapeHTML(item.description || "")}</p>
                        <div class="product-card__bottom">
                            <div class="product-price">
                                <strong>${formatPrice(item.price)}</strong>
                                ${Number(item.oldPrice) > Number(item.price) ? `<del>${formatPrice(item.oldPrice)}</del>` : ""}
                            </div>
                            <button class="product-add-button" type="button" data-related-add="${escapeHTML(item.id)}" aria-label="Add ${escapeHTML(item.name)} to cart" ${out ? "disabled" : ""}>+</button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        container.addEventListener("click", event => {
            const wishlist = event.target.closest("[data-wishlist]");
            if (wishlist) {
                event.preventDefault();
                wishlist.classList.toggle("is-active");
                return;
            }

            const add = event.target.closest("[data-related-add]");
            if (!add) return;

            event.preventDefault();
            const id = add.getAttribute("data-related-add");
            const item = related.find(entry => entry.id === id);
            if (!item || Number(item.stock) <= 0) return;

            addToCart({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                stock: item.stock,
                category: item.categoryName || item.categoryId || ""
            });
            updateCartCount();
            showToast(`${item.name} added to cart`, "success");
        });
    } catch (error) {
        console.error("Unable to load related products:", error);
    }
}

function showNotFound() {
    const main = document.querySelector("main") || document.body;
    const detail = document.querySelector(".product-detail");
    if (detail) {
        detail.innerHTML = `
            <div class="container">
                <div class="home-section-empty" style="margin: 48px 0;">
                    <h3>Component not found</h3>
                    <p>This component may have been removed or is no longer available.</p>
                    <p><a href="shop.html">Browse Shop →</a></p>
                </div>
            </div>
        `;
    }

    document.getElementById("relatedProducts") && (document.getElementById("relatedProducts").innerHTML = "");
    bootPublicPage();
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element && value != null) {
        element.textContent = value;
    }
}
