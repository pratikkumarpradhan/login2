/* =========================================================
   PROJECTKART
   Shared admin UI chrome
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector("[data-admin-sidebar], #admin-sidebar");
    const overlay = document.querySelector("[data-admin-sidebar-overlay], .admin-sidebar-overlay");
    const toggles = document.querySelectorAll("[data-admin-menu-toggle], .admin-mobile-menu-button");

    const closeSidebar = () => {
        sidebar?.classList.remove("is-open", "open");
        overlay?.classList.remove("is-open", "open");
        document.body.classList.remove("admin-menu-open");
    };

    const openSidebar = () => {
        sidebar?.classList.add("is-open");
        overlay?.classList.add("is-open");
        document.body.classList.add("admin-menu-open");
    };

    toggles.forEach(button => {
        button.addEventListener("click", () => {
            if (sidebar?.classList.contains("is-open")) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    });

    overlay?.addEventListener("click", closeSidebar);

    document.querySelectorAll("[data-modal-close]").forEach(button => {
        button.addEventListener("click", () => {
            button.closest(".admin-modal, [data-product-delete-modal]")?.setAttribute("hidden", "");
        });
    });
});
