/* =========================================================
   PROJECTKART
   Admin route guard
   ========================================================= */

import {
    logoutAdmin,
    requireAdmin
} from "./admin-auth.js";

export async function guardAdminPage() {
    const user = await requireAdmin();

    if (!user) {
        const path = window.location.pathname || "";
        const onLogin = path.endsWith("/admin/login.html") || path.endsWith("admin/login.html");
        if (!onLogin) {
            window.location.replace("login.html");
        }
        return null;
    }

    document.querySelectorAll("[data-admin-user-name]").forEach(element => {
        element.textContent = user.displayName || "Administrator";
    });

    document.querySelectorAll("[data-admin-user-email]").forEach(element => {
        element.textContent = user.email || "";
    });

    document.querySelectorAll("[data-admin-avatar]").forEach(element => {
        const label = user.displayName || user.email || "A";
        element.textContent = String(label).charAt(0).toUpperCase();
    });

    document.querySelectorAll("[data-admin-logout]").forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();
            try {
                await logoutAdmin();
                window.location.href = "login.html";
            } catch (error) {
                console.error("Admin logout error:", error);
            }
        });
    });

    return user;
}

const path = window.location.pathname || "";
const isLoginPage = path.endsWith("/admin/login.html") || path.endsWith("admin/login.html");

if (!isLoginPage) {
    guardAdminPage().catch(error => {
        console.error("Admin guard error:", error);
        window.location.replace("login.html");
    });
}
