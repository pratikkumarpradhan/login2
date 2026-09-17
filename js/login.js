import { loginUser } from "./auth.js";
import { showToast, setLoading, getQueryParam } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  initLoginPage();
});

function initLoginPage() {
  const form = document.querySelector("[data-login-form]");

  if (!form) return;

  form.addEventListener("submit", handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');

  const emailInput = form.querySelector("[data-login-email]");
  const passwordInput = form.querySelector("[data-login-password]");

  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

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
    showToast("Please enter your password.", "error");
    passwordInput?.focus();
    return;
  }

  try {
    setLoading(button, true, "Signing in...");

    await loginUser(email, password);

    showToast("Welcome back!", "success");

    const redirect = getSafeRedirect();

    setTimeout(() => {
      window.location.href = redirect;
    }, 500);
  } catch (error) {
    console.error("Login error:", error);

    showToast(getLoginErrorMessage(error), "error");
  } finally {
    setLoading(button, false);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSafeRedirect() {
  const redirect = getQueryParam("redirect");

  if (!redirect) {
    return "account.html";
  }

  // Only allow local HTML pages.
  if (
    redirect.includes("://") ||
    redirect.startsWith("//") ||
    redirect.includes("<") ||
    redirect.includes(">") ||
    redirect.startsWith("javascript:")
  ) {
    return "account.html";
  }

  return redirect;
}

function getLoginErrorMessage(error) {
  const code = error?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/user-not-found":
      return "No account was found with this email.";

    case "auth/wrong-password":
      return "Incorrect email or password.";

    case "auth/invalid-credential":
      return "Incorrect email or password.";

    case "auth/user-disabled":
      return "This account has been disabled.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    case "auth/network-request-failed":
      return "Network error. Please check your connection.";

    default:
      return "Unable to sign in. Please try again.";
  }
}