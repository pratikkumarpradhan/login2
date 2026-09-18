/* =========================================================
   PROJECTKART
   Kit Details Page — live Firestore project kit detail
   ========================================================= */

import {
    getKit,
    getKits
} from "./kits.js";

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

const KIT_ORDER_LIMIT = 99;

document.addEventListener("DOMContentLoaded", () => {
    initKitPage();
});

export async function initKitPage() {
    bootPublicPage();
    initCart();
    updateCartCount();
    setupChrome();

    const kitId = getQueryParam("id");

    if (!kitId) {
        showNotFound();
        return;
    }

    try {
        const kit = await getKit(kitId);

        if (!kit || !kit.name || kit.active === false) {
            showNotFound();
            return;
        }

        document.title = `${kit.name} — ProjectKart`;
        hydrateKit(kit);
        setupPurchaseControls(kit);
        setupTabs();
        setupGallery(kit);
        await loadRelatedKits(kit);
        bootPublicPage();
    } catch (error) {
        console.error("Kit loading error:", error);
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

    document.getElementById("backToTop")?.addEventListener("click", () => {
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

function kitAvailability(kit) {
    const stock = Number(kit.stock);
    if (Number.isFinite(stock) && stock >= 0) {
        return {
            available: stock > 0,
            limited: stock > 0 && stock < 10,
            maxQty: Math.max(1, stock || 1),
            stock
        };
    }

    return {
        available: kit.active !== false,
        limited: false,
        maxQty: KIT_ORDER_LIMIT,
        stock: KIT_ORDER_LIMIT
    };
}

function hydrateKit(kit) {
    const { available, limited, maxQty, stock } = kitAvailability(kit);
    const oldPrice = Number(kit.oldPrice) || 0;
    const price = Number(kit.price) || 0;
    const hasDiscount = oldPrice > price;
    const discountPercent = hasDiscount
        ? Math.round(((oldPrice - price) / oldPrice) * 100)
        : 0;
    const includes = Array.isArray(kit.includes)
        ? kit.includes.map(item => String(item || "").trim()).filter(Boolean)
        : String(kit.includes || "")
            .split(/\n|,/)
            .map(item => item.trim())
            .filter(Boolean);

    const categoryLabel = [
        kit.category || "Project Kit",
        kit.difficulty || ""
    ].filter(Boolean).join(" / ").toUpperCase();

    setText("productName", kit.name);
    setText("productDescription", kit.description || "No description available.");
    setText("productLongDescription", kit.description || "No description available.");
    setText("productBreadcrumbName", kit.name);
    setText("productCategory", categoryLabel);
    setText("productPrice", formatPrice(price));

    const categoryCrumb = document.getElementById("productCategoryBreadcrumb");
    if (categoryCrumb) {
        categoryCrumb.textContent = kit.category || "Project Kits";
        categoryCrumb.href = "project-kits.html";
    }

    const image = document.getElementById("productMainImage");
    if (image) {
        image.src = kit.image || "assets/images/placeholders/product-placeholder.jpg";
        image.alt = kit.name;
    }

    const zoomImage = document.getElementById("productZoomImage");
    if (zoomImage) {
        zoomImage.src = kit.image || "";
        zoomImage.alt = kit.name;
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
        const badgeText = kit.badge || kit.difficulty || "";
        if (badgeText) {
            badge.textContent = String(badgeText).toUpperCase();
            badge.hidden = false;
            badge.removeAttribute("hidden");
        } else {
            badge.hidden = true;
            badge.setAttribute("hidden", "");
        }
    }

    const stockMessage = document.getElementById("productStockMessage");
    if (stockMessage) {
        const message = stockMessage.querySelector("span:last-child") || stockMessage;
        if (!available) {
            message.textContent = "Currently unavailable";
            stockMessage.classList.add("is-out");
        } else if (limited) {
            message.textContent = `Only ${stock} left — order soon`;
            stockMessage.classList.remove("is-out");
        } else {
            message.textContent = "Available and ready to order";
            stockMessage.classList.remove("is-out");
        }
    }

    setText("specCategory", kit.category || "Project Kit");
    setText("specAvailability", available ? "Available" : "Unavailable");
    setText("specProductId", kit.id);
    setText("specDifficulty", kit.difficulty || "Beginner");
    setText("specIncludes", includes.length ? `${includes.length} items` : "See description");
    setText("productSku", `SKU ${kit.sku || buildSku(kit)}`);

    renderIncludes(includes);

    const quantity = document.getElementById("productQuantity");
    if (quantity) {
        quantity.max = String(maxQty);
        quantity.value = "1";
        quantity.disabled = !available;
    }

    const addButton = document.getElementById("addToCartButton");
    if (addButton) {
        addButton.disabled = !available;
        addButton.classList.toggle("is-disabled", !available);
    }

    const buyNowButton = document.getElementById("buyNowButton");
    if (buyNowButton) {
        buyNowButton.disabled = !available;
        buyNowButton.classList.toggle("is-disabled", !available);
    }

    renderThumbnails(kit);
}

function renderIncludes(includes) {
    const panel = document.getElementById("kitIncludesPanel");
    const block = document.getElementById("kitIncludesBlock");

    if (!panel || !block) return;

    if (!includes.length) {
        block.hidden = true;
        block.setAttribute("hidden", "");
        panel.innerHTML = "";
        return;
    }

    panel.innerHTML = includes
        .map(item => `<li>${escapeHTML(item)}</li>`)
        .join("");
    block.hidden = false;
    block.removeAttribute("hidden");
}

function buildSku(kit) {
    const slug = String(kit.slug || kit.name || "KIT")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 18);
    return `PK-KIT-${slug || "ITEM"}`;
}

function renderThumbnails(kit) {
    const thumbs = document.getElementById("productThumbnails");
    if (!thumbs) return;

    const images = Array.isArray(kit.images) && kit.images.length
        ? kit.images
        : [kit.image || "assets/images/placeholders/product-placeholder.jpg"].filter(Boolean);

    const galleryImages = images.length === 1 ? [images[0], images[0]] : images;

    thumbs.innerHTML = galleryImages.map((src, index) => `
        <button
            type="button"
            class="product-gallery__thumb${index === 0 ? " is-active" : ""}"
            data-image-index="${index}"
            data-image-src="${escapeHTML(src)}"
            aria-label="Kit image ${index + 1}"
        >
            <img src="${escapeHTML(src)}" alt="">
        </button>
    `).join("");
}

function setupGallery(kit) {
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

function setupPurchaseControls(kit) {
    const input = document.getElementById("productQuantity");
    const minus = document.getElementById("quantityMinus");
    const plus = document.getElementById("quantityPlus");
    const addButton = document.getElementById("addToCartButton");
    const buyNowButton = document.getElementById("buyNowButton");
    const whatsapp = document.getElementById("orderWhatsAppButton");
    const { available, maxQty, stock } = kitAvailability(kit);

    const readQuantity = () => {
        let value = Number(input?.value || 1);
        if (!Number.isFinite(value)) value = 1;
        value = Math.max(1, Math.min(maxQty, value));
        if (input) input.value = String(value);
        return value;
    };

    const orderOnWhatsApp = () => {
        const quantity = readQuantity();
        const message = buildSingleProductWhatsAppMessage({
            name: kit.name,
            quantity,
            unitPrice: kit.price
        });
        openWhatsAppOrder(message);
    };

    minus?.addEventListener("click", () => {
        if (!input) return;
        input.value = String(Math.max(1, Number(input.value || 1) - 1));
    });

    plus?.addEventListener("click", () => {
        if (!input) return;
        input.value = String(Math.min(maxQty, Number(input.value || 1) + 1));
    });

    input?.addEventListener("change", readQuantity);

    addButton?.addEventListener("click", () => {
        if (!available) {
            showToast("This kit is currently unavailable.", "error");
            return;
        }

        try {
            const quantity = readQuantity();
            addToCart({
                id: `kit:${kit.id}`,
                name: kit.name,
                price: kit.price,
                image: kit.image,
                stock,
                category: kit.category || "Project Kit"
            }, quantity);
            updateCartCount();
            showToast(`${kit.name} added to cart`, "success");
        } catch (error) {
            console.error("Add kit to cart error:", error);
            showToast(error.message || "Unable to add to cart.", "error");
        }
    });

    buyNowButton?.addEventListener("click", () => {
        if (!available) {
            showToast("This kit is currently unavailable.", "error");
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

async function loadRelatedKits(kit) {
    const container = document.getElementById("relatedProducts");
    if (!container) return;

    try {
        const kits = await getKits();
        const related = kits.filter(item => item.id !== kit.id && item.active !== false);

        if (!related.length) {
            container.innerHTML = `
                <div class="home-section-empty" style="grid-column: 1 / -1;">
                    <h3>No related kits yet.</h3>
                    <p><a href="project-kits.html">Browse all project kits →</a></p>
                </div>
            `;
            return;
        }

        container.innerHTML = related.slice(0, 4).map(item => {
            const image = item.image || "assets/images/placeholders/product-placeholder.jpg";
            return `
                <article class="product-card" data-kit-id="${escapeHTML(item.id)}">
                    <div class="product-card__media">
                        <a href="kit.html?id=${encodeURIComponent(item.id)}" class="product-card__image-link">
                            <img src="${escapeHTML(image)}" alt="${escapeHTML(item.name)}" class="product-card__image" loading="lazy">
                        </a>
                        ${item.badge || item.difficulty ? `<span class="product-badge product-badge--blue">${escapeHTML(item.badge || item.difficulty)}</span>` : ""}
                    </div>
                    <div class="product-card__body">
                        <div class="product-card__topline">
                            <span class="product-card__category">${escapeHTML((item.category || "Project Kit").toUpperCase())}</span>
                            <span class="product-stock product-stock--available"><span></span> Available</span>
                        </div>
                        <a href="kit.html?id=${encodeURIComponent(item.id)}" class="product-card__title">${escapeHTML(item.name)}</a>
                        <p class="product-card__description">${escapeHTML(item.description || "")}</p>
                        <div class="product-card__bottom">
                            <div class="product-price">
                                <strong>${formatPrice(item.price)}</strong>
                                ${Number(item.oldPrice) > Number(item.price) ? `<del>${formatPrice(item.oldPrice)}</del>` : ""}
                            </div>
                            <a class="product-card__link" href="kit.html?id=${encodeURIComponent(item.id)}">View →</a>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    } catch (error) {
        console.error("Related kits error:", error);
        container.innerHTML = `
            <div class="home-section-empty" style="grid-column: 1 / -1;">
                <h3>Unable to load related kits.</h3>
                <p><a href="project-kits.html">Browse project kits →</a></p>
            </div>
        `;
    }
}

function showNotFound() {
    const detail = document.querySelector(".product-detail");
    if (detail) {
        detail.innerHTML = `
            <div class="container">
                <div class="home-section-empty" style="margin: 48px 0;">
                    <h3>Kit not found</h3>
                    <p>This project kit may have been removed or is no longer available.</p>
                    <p><a href="project-kits.html">Browse Project Kits →</a></p>
                </div>
            </div>
        `;
    }

    const related = document.getElementById("relatedProducts");
    if (related) related.innerHTML = "";
    bootPublicPage();
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element && value != null) {
        element.textContent = value;
    }
}
