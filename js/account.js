import { watchUser, logoutUser } from "./auth.js";
import { getUser, updateUserProfile } from "./user.js";
import { getUserOrders } from "./orders.js";
import { formatPrice, escapeHTML, showToast, setLoading } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  initAccountPage();
});

function initAccountPage() {
  watchUser(async (user) => {
    if (!user) {
      window.location.href = "login.html?redirect=account.html";
      return;
    }

    await loadAccount(user);
  });

  setupAccountActions();
}

async function loadAccount(user) {
  try {
    const profile = await getUser(user.uid);

    renderProfile(user, profile);
    await loadOrders(user.uid);
  } catch (error) {
    console.error("Account loading error:", error);
    showToast("Unable to load your account.", "error");
  }
}

function renderProfile(user, profile) {
  const name =
    profile?.name ||
    user.displayName ||
    "User";

  const email =
    profile?.email ||
    user.email ||
    "";

  const phone =
    profile?.phone ||
    "";

  const address =
    profile?.address ||
    "";

  document.querySelectorAll("[data-user-name]").forEach((element) => {
    element.textContent = name;
  });

  const nameInput = document.querySelector("[data-profile-name]");
  const emailInput = document.querySelector("[data-profile-email]");
  const phoneInput = document.querySelector("[data-profile-phone]");
  const addressInput = document.querySelector("[data-profile-address]");

  if (nameInput) nameInput.value = name;
  if (emailInput) emailInput.value = email;
  if (phoneInput) phoneInput.value = phone;
  if (addressInput) addressInput.value = address;

  const avatar = document.querySelector("[data-profile-avatar]");

  if (avatar) {
    avatar.textContent = getInitials(name);
  }
}

async function loadOrders(uid) {
  const container = document.querySelector("[data-account-orders]");

  if (!container) return;

  container.innerHTML = `
    <div class="account-loading">
      Loading your orders...
    </div>
  `;

  try {
    const orders = await getUserOrders(uid);

    if (!orders.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Your orders will appear here after you make a purchase.</p>
          <a href="shop.html" class="btn btn-primary">
            Start Shopping
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = orders
      .map((order) => createOrderCard(order))
      .join("");
  } catch (error) {
    console.error("Orders loading error:", error);

    container.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load orders</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

function createOrderCard(order) {
  const orderId = escapeHTML(order.id || "");
  const shortId = orderId.slice(-8).toUpperCase();

  const status = order.status || "pending";
  const paymentStatus = order.paymentStatus || "pending";

  const total = formatPrice(order.total || 0);

  const items = Array.isArray(order.items)
    ? order.items
    : [];

  const itemCount = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const createdAt = formatOrderDate(order.createdAt);

  return `
    <article class="account-order-card">
      <div class="account-order-header">

        <div>
          <span class="account-order-label">
            Order
          </span>

          <h3>
            #${shortId}
          </h3>

          <span class="account-order-date">
            ${createdAt}
          </span>
        </div>

        <span class="order-status order-status-${escapeHTML(status)}">
          ${formatStatus(status)}
        </span>

      </div>

      <div class="account-order-body">

        <div class="account-order-meta">
          <span>
            ${itemCount} ${itemCount === 1 ? "item" : "items"}
          </span>

          <span>
            Payment: ${formatStatus(paymentStatus)}
          </span>

          <strong>
            ${total}
          </strong>
        </div>

        <div class="account-order-items">
          ${items
            .slice(0, 4)
            .map((item) => createOrderItem(item))
            .join("")}
        </div>

      </div>
    </article>
  `;
}

function createOrderItem(item) {
  const image = item.image || "assets/images/placeholders/product-placeholder.jpg";
  const name = escapeHTML(item.name || "Product");
  const quantity = Number(item.quantity || 1);

  return `
    <div class="account-order-item">

      <div class="account-order-item-image">
        <img
          src="${escapeHTML(image)}"
          alt="${name}"
          loading="lazy"
          onerror="this.style.display='none'"
        >
      </div>

      <div class="account-order-item-info">
        <strong>${name}</strong>
        <span>Qty: ${quantity}</span>
      </div>

    </div>
  `;
}

function setupAccountActions() {
  const profileForm = document.querySelector("[data-profile-form]");

  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await logoutUser();
      } catch (error) {
        console.error("Logout error:", error);
        showToast("Unable to log out.", "error");
      }
    });
  });
}

async function handleProfileUpdate(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');

  const nameInput = form.querySelector("[data-profile-name]");
  const phoneInput = form.querySelector("[data-profile-phone]");
  const addressInput = form.querySelector("[data-profile-address]");

  const name = nameInput?.value.trim() || "";
  const phone = phoneInput?.value.trim() || "";
  const address = addressInput?.value.trim() || "";

  if (!name) {
    showToast("Please enter your name.", "error");
    nameInput?.focus();
    return;
  }

  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    window.location.href = "login.html?redirect=account.html";
    return;
  }

  try {
    setLoading(button, true, "Saving...");

    await updateUserProfile(user.uid, {
      name,
      phone,
      address
    });

    showToast("Profile updated successfully.", "success");

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = name;
    });
  } catch (error) {
    console.error("Profile update error:", error);
    showToast("Unable to update your profile.", "error");
  } finally {
    setLoading(button, false);
  }
}

function getCurrentAuthenticatedUser() {
  return new Promise((resolve) => {
    watchUser((user) => {
      resolve(user);
    });
  });
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatStatus(status) {
  return String(status)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatOrderDate(timestamp) {
  if (!timestamp) return "Date unavailable";

  try {
    const date =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "Date unavailable";
  }
}