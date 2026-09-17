import { registerUser } from "./auth.js";
import { showToast, setLoading } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  initRegisterPage();
});

function initRegisterPage() {
  const form = document.querySelector("[data-register-form]");

  if (!form) return;

  form.addEventListener("submit", handleRegister);

  setupPasswordToggle();
  setupPasswordStrength();
}

async function handleRegister(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');

  const nameInput = form.querySelector("[data-register-name]");
  const emailInput = form.querySelector("[data-register-email]");
  const passwordInput = form.querySelector("[data-register-password]");
  const confirmInput = form.querySelector("[data-register-confirm-password]");
  const termsInput = form.querySelector("[data-register-terms]");

  const name = nameInput?.value.trim() || "";
  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";
  const confirmPassword = confirmInput?.value || "";

  if (!name) {
    showToast("Please enter your name.", "error");
    nameInput?.focus();
    return;
  }

  if (name.length < 2) {
    showToast("Your name must be at least 2 characters.", "error");
    nameInput?.focus();
    return;
  }

  if (!email) {
    showToast("Please enter your email address.", "error");
    emailInput?.focus();
    return;
  }

  if (!isValidEmail(email)) {
    showToast("Please enter a valid email address.", "error");
    emailInput?.focus();
    return;
  }

  if (!password) {
    showToast("Please create a password.", "error");
    passwordInput?.focus();
    return;
  }

  if (!isStrongPassword(password)) {
    showToast(
      "Password must be at least 8 characters and contain a letter and a number.",
      "error"
    );
    passwordInput?.focus();
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match.", "error");
    confirmInput?.focus();
    return;
  }

  if (termsInput && !termsInput.checked) {
    showToast("Please accept the terms and conditions.", "error");
    termsInput.focus();
    return;
  }

  try {
    setLoading(button, true, "Creating account...");

    await registerUser({
      name,
      email,
      password
    });

    showToast("Account created successfully!", "success");

    setTimeout(() => {
      window.location.href = "account.html";
    }, 600);
  } catch (error) {
    console.error("Registration error:", error);

    showToast(getRegisterErrorMessage(error), "error");
  } finally {
    setLoading(button, false);
  }
}

function setupPasswordToggle() {
  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const targetSelector = toggle.getAttribute("data-password-toggle");

      const input = document.querySelector(targetSelector);

      if (!input) return;

      const isPassword = input.type === "password";

      input.type = isPassword ? "text" : "password";

      toggle.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
      );

      toggle.textContent = isPassword ? "Hide" : "Show";
    });
  });
}

function setupPasswordStrength() {
  const passwordInput = document.querySelector(
    "[data-register-password]"
  );

  const strengthElement = document.querySelector(
    "[data-password-strength]"
  );

  if (!passwordInput || !strengthElement) return;

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

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      level: "weak",
      label: "Weak password"
    };
  }

  if (score <= 4) {
    return {
      level: "medium",
      label: "Medium password"
    };
  }

  return {
    level: "strong",
    label: "Strong password"
  };
}

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRegisterErrorMessage(error) {
  const code = error?.code || "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/weak-password":
      return "Please choose a stronger password.";

    case "auth/operation-not-allowed":
      return "Email registration is currently unavailable.";

    case "auth/network-request-failed":
      return "Network error. Please check your connection.";

    default:
      return "Unable to create your account. Please try again.";
  }
}