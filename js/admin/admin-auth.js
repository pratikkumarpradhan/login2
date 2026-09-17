/* =========================================================
   PROJECTKART
   Admin authentication helpers
   ========================================================= */

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth
} from "../firebase.js";

import {
    getAuthErrorMessage
} from "../auth.js";

import {
    isCurrentUserAdmin
} from "../admin-check.js";

export {
    isCurrentUserAdmin
} from "../admin-check.js";

let adminResolved = false;
let currentAdminUser = null;
const adminReadyWaiters = [];

function resolveAdminReady(user) {
    currentAdminUser = user || null;
    adminResolved = true;
    while (adminReadyWaiters.length) {
        adminReadyWaiters.shift()(currentAdminUser);
    }
}

onAuthStateChanged(auth, user => {
    resolveAdminReady(user);
});

export function whenAdminAuthReady() {
    if (adminResolved) {
        return Promise.resolve(currentAdminUser);
    }

    return new Promise(resolve => {
        adminReadyWaiters.push(resolve);
    });
}

export async function requireAdmin() {
    const user = await whenAdminAuthReady();

    if (!user) {
        return null;
    }

    const allowed = await isCurrentUserAdmin(user);
    return allowed ? user : null;
}

export async function loginAdmin(email, password) {
    const credentials = await signInWithEmailAndPassword(
        auth,
        String(email || "").trim(),
        password
    );

    const allowed = await isCurrentUserAdmin(credentials.user);
    if (!allowed) {
        await signOut(auth);
        throw new Error("This account does not have administrator access.");
    }

    return credentials.user;
}

export async function logoutAdmin() {
    await signOut(auth);
}

function setStatus(element, message, type = "") {
    if (!element) {
        return;
    }
    element.textContent = message;
    element.dataset.status = type;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("[data-admin-login-form]");
    if (!form) {
        return;
    }

    whenAdminAuthReady().then(async user => {
        if (user && await isCurrentUserAdmin(user)) {
            window.location.replace("index.html");
        }
    }).catch(error => {
        console.error("Admin login auth check error:", error);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const email = form.querySelector("[data-admin-login-email]")?.value.trim() || "";
        const password = form.querySelector("[data-admin-login-password]")?.value || "";
        const status = form.querySelector("[data-admin-login-status]");
        const button = form.querySelector("[data-admin-login-submit]");
        const buttonText = form.querySelector("[data-admin-login-submit-text]");
        const spinner = form.querySelector("[data-admin-login-spinner]");

        setStatus(status, "");

        if (!email || !password) {
            setStatus(status, "Please enter your admin email and password.", "error");
            return;
        }

        try {
            if (button) button.disabled = true;
            if (buttonText) buttonText.textContent = "Signing in...";
            if (spinner) spinner.hidden = false;
            setStatus(status, "Checking administrator access...", "info");

            await loginAdmin(email, password);
            setStatus(status, "Access granted. Redirecting...", "success");
            window.location.href = "index.html";
        } catch (error) {
            console.error("Admin login error:", error);
            const message = error?.message?.includes("administrator")
                ? error.message
                : getAuthErrorMessage(error, "Unable to sign in to the admin panel.");
            setStatus(status, message, "error");
        } finally {
            if (button) button.disabled = false;
            if (buttonText) buttonText.textContent = "Sign in to dashboard";
            if (spinner) spinner.hidden = true;
        }
    });

    document.querySelector("[data-admin-password-toggle]")?.addEventListener("click", () => {
        const input = form.querySelector("[data-admin-login-password]");
        if (!input) {
            return;
        }
        input.type = input.type === "password" ? "text" : "password";
    });
});
