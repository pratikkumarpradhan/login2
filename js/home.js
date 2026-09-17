/* =========================================================
   PROJECTKART
   Homepage
   ========================================================= */

import { addToCart, initCart, updateCartCount } from "./cart.js";
import { showToast } from "./utils.js";


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
    setupWishlistButtons();
    setupAddToCartButtons();
    setupQuickArrows();
    updateCartCount();
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


function setupWishlistButtons() {
    document.querySelectorAll("[data-wishlist]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            button.classList.toggle("is-active");
        });
    });
}


function setupAddToCartButtons() {
    document.querySelectorAll("[data-add-cart]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const card = button.closest(".product-card");
            const id = button.getAttribute("data-add-cart");
            const name = card?.querySelector(".product-card__title")?.textContent?.trim() || "Component";
            const priceText = card?.querySelector(".product-price strong")?.textContent || "0";
            const price = Number(priceText.replace(/[^\d]/g, "")) || 0;
            const image = card?.querySelector("img")?.getAttribute("src") || "";

            addToCart({ id, name, price, image });
            showToast(`${name} added to cart`);
        });
    });
}


function setupQuickArrows() {
    document.querySelectorAll(".product-card").forEach(card => {
        if (card.querySelector(".product-card__quick-arrow")) {
            return;
        }

        const media = card.querySelector(".product-card__media");

        if (!media) {
            return;
        }

        const arrow = document.createElement("span");
        arrow.className = "product-card__quick-arrow";
        arrow.textContent = "↗";
        media.appendChild(arrow);
    });
}
