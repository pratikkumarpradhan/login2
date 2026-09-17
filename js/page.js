/* =========================================================
   PROJECTKART
   Global public-page lifecycle

   Shared layout (navbar, footer, page shell) must become
   visible even if Firebase or page-specific JS fails.
   ========================================================= */

function hidePageLoader() {
    document.querySelectorAll(
        "#pageLoader, .page-loader, [data-page-loader], .page-transition"
    ).forEach(loader => {
        loader.classList.add("is-hidden", "is-complete");
        loader.classList.remove("is-active");
        loader.setAttribute("aria-hidden", "true");
        loader.style.pointerEvents = "none";
    });

    document.body.classList.remove("is-loading", "no-scroll", "mobile-menu-open");
    document.documentElement.classList.add("page-ready");
}

function revealContent() {
    document.querySelectorAll(".reveal, [data-reveal]").forEach(element => {
        element.classList.add("is-visible", "revealed");
        element.setAttribute("data-reveal", "visible");
    });

    document.querySelectorAll(".stagger").forEach(element => {
        element.classList.add("is-visible");
    });
}

function closeMobileMenu() {
    document.querySelectorAll(
        "[data-mobile-menu], #mobileMenu, .mobile-menu"
    ).forEach(menu => {
        menu.classList.remove("is-open", "open");
        menu.setAttribute("aria-hidden", "true");
    });

    document.querySelectorAll(
        "[data-mobile-overlay], .mobile-menu-overlay"
    ).forEach(overlay => {
        overlay.classList.remove("is-open", "open");
    });

    document.querySelectorAll(
        "[data-mobile-menu-button], #mobileMenuToggle, [data-menu-toggle], .navbar-menu-toggle, .navbar__menu-toggle, .navbar-mobile-button"
    ).forEach(button => {
        button.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
    });

    document.body.classList.remove("no-scroll", "mobile-menu-open");
}

function finishPageLoad() {
    hidePageLoader();
    revealContent();
    closeMobileMenu();
}

export function bootPublicPage() {
    finishPageLoad();
}

document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(finishPageLoad, 80);
});

window.addEventListener("load", finishPageLoad);

window.addEventListener("pageshow", finishPageLoad);

window.setTimeout(finishPageLoad, 1200);
