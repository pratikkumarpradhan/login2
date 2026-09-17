import { getAuthErrorMessage, registerUser, whenAuthReady } from "./auth.js";
import { showToast, setLoading } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
    initRegisterPage();
});

function initRegisterPage() {
    const form = document.querySelector("[data-register-form]");

    if (!form) {
        return;
    }

    whenAuthReady().then(user => {
        if (user) {
            window.location.replace("account.html");
        }
    }).catch(error => {
        console.error("Register auth check error:", error);
    });

    form.addEventListener("submit", handleRegister);
    setupPasswordToggle();
    setupPasswordStrength();
}

async function handleRegister(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector("[data-register-submit], button[type='submit']");
    const status = form.querySelector("[data-register-status]");
    const values = readForm(form);
    const error = validateRegistration(values, form);

    setStatus(status, "");

    if (error) {
        showToast(error.message, "error");
        setStatus(status, error.message, "error");
        error.input?.focus();
        return;
    }

    try {
        setLoading(button, true, "Creating account...");
        setStatus(status, "Creating your account...", "info");

        await registerUser({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            password: values.password,
            address: values.address,
            city: values.city,
            state: values.state,
            postalCode: values.postalCode,
            country: values.country
        });

        const message = "Your account has been created. Please verify your email address.";
        setStatus(status, message, "success");
        showToast(message, "success");

        window.setTimeout(() => {
            window.location.href = "account.html";
        }, 700);
    } catch (err) {
        console.error("Registration error:", err);
        const message = getAuthErrorMessage(err, "Unable to create your account. Please try again.");
        setStatus(status, message, "error");
        showToast(message, "error");
    } finally {
        setLoading(button, false);
    }
}

function readForm(form) {
    const value = selector => form.querySelector(selector)?.value.trim() || "";

    return {
        firstName: value("[data-register-first-name]") || splitName(value("[data-register-name]")).firstName,
        lastName: value("[data-register-last-name]") || splitName(value("[data-register-name]")).lastName,
        email: value("[data-register-email]").toLowerCase(),
        phone: value("[data-register-phone]"),
        password: form.querySelector("[data-register-password]")?.value || "",
        confirmPassword: form.querySelector("[data-register-confirm-password]")?.value || "",
        address: value("[data-register-address]"),
        city: value("[data-register-city]"),
        state: value("[data-register-state]"),
        postalCode: value("[data-register-postal]"),
        country: value("[data-register-country]") || "India",
        terms: form.querySelector("[data-register-terms]")
    };
}

function splitName(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ")
    };
}

function validateRegistration(values, form) {
    const field = name => form.querySelector(`[data-register-${name}]`);

    if (!values.firstName || values.firstName.length < 2) {
        return { message: "Please enter your first name.", input: field("first-name") || field("name") };
    }

    if (!values.lastName) {
        return { message: "Please enter your last name.", input: field("last-name") || field("name") };
    }

    if (!values.email) {
        return { message: "Please enter your email address.", input: field("email") };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        return { message: "Please enter a valid email address.", input: field("email") };
    }

    if (!values.phone) {
        return { message: "Please enter your phone number.", input: field("phone") };
    }

    if (!/^[+]?[\d\s-]{8,18}$/.test(values.phone) || values.phone.replace(/\D/g, "").length < 8) {
        return { message: "Please enter a valid phone number.", input: field("phone") };
    }

    if (!values.password) {
        return { message: "Please create a password.", input: field("password") };
    }

    if (!(values.password.length >= 8 && /[A-Za-z]/.test(values.password) && /\d/.test(values.password))) {
        return {
            message: "Password must be at least 8 characters and contain a letter and a number.",
            input: field("password")
        };
    }

    if (values.password !== values.confirmPassword) {
        return { message: "Passwords do not match.", input: field("confirm-password") };
    }

    if (!values.address || values.address.length < 6) {
        return { message: "Please enter your address.", input: field("address") };
    }

    if (!values.city) {
        return { message: "Please enter your city.", input: field("city") };
    }

    if (!values.state) {
        return { message: "Please enter your state.", input: field("state") };
    }

    if (!/^[A-Za-z0-9\s-]{3,12}$/.test(values.postalCode)) {
        return { message: "Please enter a valid PIN / postal code.", input: field("postal") };
    }

    if (!values.country) {
        return { message: "Please enter your country.", input: field("country") };
    }

    if (values.terms && !values.terms.checked) {
        return { message: "Please accept the terms and conditions.", input: values.terms };
    }

    return null;
}

function setupPasswordToggle() {
    document.querySelectorAll("[data-password-toggle]").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const targetSelector = toggle.getAttribute("data-password-toggle");
            const input = (targetSelector && document.querySelector(targetSelector))
                || toggle.closest(".form-input-wrapper, .password-input-wrapper")?.querySelector("input");

            if (!input) {
                return;
            }

            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            toggle.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            toggle.textContent = isPassword ? "Hide" : "Show";
        });
    });
}

function setupPasswordStrength() {
    const passwordInput = document.querySelector("[data-register-password]");
    const strengthElement = document.querySelector("[data-password-strength]");

    if (!passwordInput || !strengthElement) {
        return;
    }

    passwordInput.addEventListener("input", () => {
        const password = passwordInput.value;

        if (!password) {
            strengthElement.textContent = "";
            strengthElement.removeAttribute("data-strength");
            return;
        }

        const strength = getPasswordStrength(password);
        strengthElement.textContent = strength.label;
        strengthElement.setAttribute("data-strength", strength.level);
    });
}

function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
        return { level: "weak", label: "Weak password" };
    }
    if (score <= 4) {
        return { level: "medium", label: "Medium password" };
    }
    return { level: "strong", label: "Strong password" };
}

function setStatus(element, message, type = "") {
    if (!element) {
        return;
    }
    element.textContent = message;
    element.dataset.status = type;
}
