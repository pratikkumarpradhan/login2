import {
    getAuthErrorMessage,
    loginUser,
    resetPassword,
    whenAuthReady
} from "./auth.js";
import { showToast, setLoading, getQueryParam } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
    initLoginPage();
});

function initLoginPage() {
    const form = document.querySelector("[data-login-form]");

    if (!form) {
        return;
    }

    whenAuthReady().then(user => {
        if (user) {
            window.location.replace(getSafeRedirect());
        }
    }).catch(error => {
        console.error("Login auth check error:", error);
    });

    form.addEventListener("submit", handleLogin);
    setupPasswordToggle();
    setupForgotPassword();
}

async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector("[data-login-submit], button[type='submit']");
    const emailInput = form.querySelector("[data-login-email]");
    const passwordInput = form.querySelector("[data-login-password]");
    const status = document.querySelector("[data-login-status]");

    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    setStatus(status, "");

    if (!email) {
        return fail(status, emailInput, "Please enter your email address.");
    }

    if (!isValidEmail(email)) {
        return fail(status, emailInput, "Please enter a valid email address.");
    }

    if (!password) {
        return fail(status, passwordInput, "Please enter your password.");
    }

    try {
        setLoading(button, true, "Signing in...");
        setStatus(status, "Signing you in...", "info");

        await loginUser(email, password);

        showToast("Welcome back!", "success");
        setStatus(status, "Signed in. Redirecting...", "success");
        window.location.href = getSafeRedirect();
    } catch (error) {
        console.error("Login error:", error);
        const message = getAuthErrorMessage(error, "Unable to sign in. Please try again.");
        setStatus(status, message, "error");
        showToast(message, "error");
    } finally {
        setLoading(button, false);
    }
}

function setupForgotPassword() {
    const trigger = document.querySelector("[data-forgot-password]");
    const panel = document.querySelector("[data-forgot-panel]");
    const loginCard = document.querySelector("[data-login-view]") || document.querySelector("[data-login-form]");
    const form = document.querySelector("[data-forgot-form]");
    const back = document.querySelector("[data-forgot-back]");

    trigger?.addEventListener("click", event => {
        event.preventDefault();
        if (panel) {
            panel.hidden = false;
            loginCard?.setAttribute("hidden", "");
            panel.querySelector("[data-forgot-email]")?.focus();
            return;
        }

        const email = document.querySelector("[data-login-email]")?.value.trim()
            || window.prompt("Enter the email address for your account:");

        if (email) {
            sendReset(email);
        }
    });

    back?.addEventListener("click", event => {
        event.preventDefault();
        if (panel) {
            panel.hidden = true;
        }
        loginCard?.removeAttribute("hidden");
    });

    form?.addEventListener("submit", async event => {
        event.preventDefault();
        const input = form.querySelector("[data-forgot-email]");
        await sendReset(input?.value.trim() || "", form);
    });
}

async function sendReset(email, form) {
    const status = document.querySelector("[data-forgot-status], [data-login-status]");
    const button = form?.querySelector("button[type='submit']");

    if (!email || !isValidEmail(email)) {
        setStatus(status, "Please enter a valid email address.", "error");
        return;
    }

    try {
        setLoading(button, true, "Sending...");
        setStatus(status, "Sending reset email...", "info");
        await resetPassword(email);
        const message = "If an account exists for that email, a reset link has been sent.";
        setStatus(status, message, "success");
        showToast(message, "success");
    } catch (error) {
        console.error("Password reset error:", error);
        const code = error?.code || "";
        let message = "Unable to send a reset email. Please try again.";

        if (code === "auth/invalid-email") {
            message = "Please enter a valid email address.";
        } else if (code === "auth/too-many-requests") {
            message = "Too many attempts. Please try again later.";
        } else if (code === "auth/network-request-failed") {
            message = "Network error. Please check your connection.";
        }

        setStatus(status, message, "error");
        showToast(message, "error");
    } finally {
        setLoading(button, false);
    }
}

function setupPasswordToggle() {
    document.querySelectorAll("[data-password-toggle]").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const targetSelector = toggle.getAttribute("data-password-toggle");
            const input = (targetSelector && document.querySelector(targetSelector))
                || toggle.closest(".password-input-wrapper, .form-input-wrapper")?.querySelector("input")
                || document.querySelector("[data-login-password]");

            if (!input) {
                return;
            }

            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            toggle.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");

            toggle.querySelector(".password-eye-open")?.toggleAttribute("hidden", isPassword);
            toggle.querySelector(".password-eye-closed")?.toggleAttribute("hidden", !isPassword);

            if (!toggle.querySelector("svg")) {
                toggle.textContent = isPassword ? "Hide" : "Show";
            }
        });
    });
}

function fail(status, input, message) {
    setStatus(status, message, "error");
    showToast(message, "error");
    input?.focus();
}

function setStatus(element, message, type = "") {
    if (!element) {
        return;
    }
    element.textContent = message;
    element.dataset.status = type;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSafeRedirect() {
    const redirect = getQueryParam("redirect");

    if (!redirect) {
        return "account.html";
    }

    if (
        redirect.includes("://")
        || redirect.startsWith("//")
        || redirect.includes("<")
        || redirect.includes(">")
        || redirect.startsWith("javascript:")
    ) {
        return "account.html";
    }

    return redirect;
}
