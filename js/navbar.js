/* =========================================================
   PROJECTKART
   Navbar
   Shared chrome must initialize even if Firebase auth fails.
   ========================================================= */

import {
    initCart,
    updateCartCount
} from "./cart.js";

document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
});

export function initNavbar() {
    setupMobileMenu();
    setupAccountMenu();
    setupLogout();
    setupAuthState();

    try {
        initCart();
        updateCartCount();
    } catch (error) {
        console.error("Navbar cart init error:", error);
    }
}

function closeMenu(button, menu) {
    menu?.classList.remove("is-open", "open");
    button?.classList.remove("is-open");
    document.body.classList.remove("no-scroll", "mobile-menu-open");
    button?.setAttribute("aria-expanded", "false");
    menu?.setAttribute("aria-hidden", "true");

    document.querySelectorAll("[data-mobile-overlay], .mobile-menu-overlay").forEach(overlay => {
        overlay.classList.remove("is-open", "open");
    });
}

function setupMobileMenu() {
    const button = document.querySelector(
        "[data-mobile-menu-button], #mobileMenuToggle, [data-menu-toggle], .navbar-menu-toggle, .navbar__menu-toggle, .navbar-mobile-button"
    );
    const menu = document.querySelector("[data-mobile-menu], #mobileMenu");
    const closeButton = document.querySelector(
        "#mobileMenuClose, [data-menu-close], .mobile-menu__close, .mobile-menu-close"
    );

    closeButton?.addEventListener("click", () => closeMenu(button, menu));
    menu?.querySelector(".mobile-menu__backdrop")?.addEventListener("click", () => closeMenu(button, menu));
    document.querySelector("[data-mobile-overlay], .mobile-menu-overlay")
        ?.addEventListener("click", () => closeMenu(button, menu));

    if (!button || !menu) {
        return;
    }

    button.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        button.classList.toggle("is-open", isOpen);
        document.body.classList.toggle("no-scroll", isOpen);
        document.body.classList.toggle("mobile-menu-open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
        menu.setAttribute("aria-hidden", String(!isOpen));

        document.querySelectorAll("[data-mobile-overlay], .mobile-menu-overlay").forEach(overlay => {
            overlay.classList.toggle("is-open", isOpen);
        });
    });

    menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => closeMenu(button, menu));
    });
}

function accountDestination(user) {
    return user ? "account.html" : "login.html";
}

function accountIconControls() {
    return document.querySelectorAll(
        "a.navbar-icon-button[aria-label='Account'], a.navbar-account, [data-account-link], .mobile-menu__bottom a[href$='account.html'], .mobile-menu__bottom a[href$='login.html'], .mobile-menu-links a[href$='account.html'], .mobile-menu-links a[href$='login.html']"
    );
}

function applyAccountNavigation(user) {
    const href = accountDestination(user);

    accountIconControls().forEach(element => {
        if (element.tagName === "A") {
            element.setAttribute("href", href);
        }
        element.dataset.authHref = href;
    });

    document.querySelectorAll("[data-account-toggle]").forEach(button => {
        button.dataset.authHref = href;
    });
}

function setupAccountMenu() {
    const button = document.querySelector("[data-account-button], [data-account-toggle]");
    const menu = document.querySelector("[data-account-menu], [data-account-dropdown], .navbar-account-dropdown");

    applyAccountNavigation(null);

    document.querySelectorAll("[data-account-toggle], [data-account-button]").forEach(trigger => {
        trigger.addEventListener("click", event => {
            const href = trigger.dataset.authHref || "login.html";

            if (menu && trigger.getAttribute("data-keep-dropdown") === "true") {
                event.stopPropagation();
                menu.classList.toggle("is-open");
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            window.location.href = href;
        });
    });

    if (menu) {
        document.addEventListener("click", () => {
            menu.classList.remove("is-open");
        });
    }
}

function setupLogout() {
    document.querySelectorAll("[data-logout], [data-logout-button], [data-navbar-logout], [data-auth-action='logout']").forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();

            try {
                const authApi = await import("./auth.js");
                await authApi.logoutUser();
                window.location.href = "index.html";
            } catch (error) {
                console.error("Logout failed:", error);
            }
        });
    });
}

function setupAuthState() {
    import("./auth.js").then(({ watchUser }) => {
        watchUser(user => {
            applyAccountNavigation(user);

            document.querySelectorAll("[data-auth-logged-out], [data-navbar-login]").forEach(element => {
                element.hidden = Boolean(user);
                element.classList.toggle("hidden", Boolean(user));
            });

            document.querySelectorAll("[data-auth-logged-in], [data-navbar-logout]").forEach(element => {
                element.hidden = !user;
                element.classList.toggle("hidden", !user);
            });

            const label = user?.displayName || user?.email || "Account";

            document.querySelectorAll("[data-user-name]").forEach(element => {
                element.textContent = label;
            });

            document.querySelectorAll("[data-navbar-user-email]").forEach(element => {
                element.textContent = user?.email || "Sign in to your account";
            });
        });
    }).catch(error => {
        console.error("Navbar auth state error:", error);
        applyAccountNavigation(null);
    });
}
