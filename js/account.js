import { logoutUser, whenAuthReady } from "./auth.js";
import { getUser, updateUserProfile } from "./user.js";
import { getUserOrders } from "./orders.js";
import { formatPrice, escapeHTML, showToast, setLoading } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
    initAccountPage();
});

function initAccountPage() {
    whenAuthReady().then(user => {
        if (!user) {
            window.location.replace("login.html?redirect=account.html");
            return;
        }
        loadAccount(user);
    }).catch(error => {
        console.error("Account auth check error:", error);
        window.location.replace("login.html?redirect=account.html");
    });

    setupAccountActions();
    setupTabs();
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
    const firstName = profile?.firstName || "";
    const lastName = profile?.lastName || "";
    const name = profile?.displayName
        || `${firstName} ${lastName}`.trim()
        || profile?.name
        || user.displayName
        || "User";
    const email = profile?.email || user.email || "";
    const phone = profile?.phone || "";
    const address = profile?.address || "";
    const city = profile?.city || "";
    const state = profile?.state || "";
    const postalCode = profile?.postalCode || "";
    const country = profile?.country || "";
    const accountStatus = profile?.accountStatus || "active";
    const emailVerified = Boolean(user.emailVerified || profile?.emailVerified);

    document.querySelectorAll("[data-user-name], [data-account-name], [data-account-user-name]").forEach(element => {
        if (element.hasAttribute("data-account-name")) {
            element.textContent = name ? `, ${name}` : "";
            return;
        }
        element.textContent = name;
    });

    const emailTarget = document.querySelector("[data-account-user-email]");
    if (emailTarget) {
        emailTarget.textContent = email;
    }

    setValue("[data-profile-name]", name);
    setValue("[data-profile-first-name]", firstName || name.split(" ")[0] || "");
    setValue("[data-profile-last-name]", lastName || name.split(" ").slice(1).join(" "));
    setValue("[data-profile-email]", email);
    setValue("[data-profile-phone]", phone);
    setValue("[data-profile-address]", address);
    setValue("[data-profile-city]", city);
    setValue("[data-profile-state]", state);
    setValue("[data-profile-postal]", postalCode);
    setValue("[data-profile-country]", country);

    const statusEl = document.querySelector("[data-account-status]");
    if (statusEl) {
        statusEl.textContent = formatStatus(accountStatus);
    }

    const verifiedEl = document.querySelector("[data-account-verified]");
    if (verifiedEl) {
        verifiedEl.textContent = emailVerified ? "Email verified" : "Email not verified";
    }

    const addressSummary = [address, city, state, postalCode, country].filter(Boolean).join(", ");
    const addressEl = document.querySelector("[data-account-address]");
    if (addressEl) {
        addressEl.textContent = addressSummary || "No address saved yet.";
    }

    const avatar = document.querySelector("[data-profile-avatar], [data-account-avatar]");
    if (avatar) {
        avatar.textContent = getInitials(name);
    }
}

function setValue(selector, value) {
    const input = document.querySelector(selector);
    if (input) {
        input.value = value;
    }
}

async function loadOrders(uid) {
    const container = document.querySelector("[data-account-orders]");

    if (!container) {
        return;
    }

    container.innerHTML = `<div class="account-loading">Loading your orders...</div>`;

    try {
        const orders = await getUserOrders(uid);

        if (!orders.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>No orders yet</h3>
                    <p>Your orders will appear here after you make a purchase.</p>
                    <a href="shop.html" class="btn btn-primary">Start Shopping</a>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => createOrderCard(order)).join("");
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
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const createdAt = formatOrderDate(order.createdAt);

    return `
        <article class="account-order-card">
            <div class="account-order-header">
                <div>
                    <span class="account-order-label">Order</span>
                    <h3>#${shortId}</h3>
                    <span class="account-order-date">${createdAt}</span>
                </div>
                <span class="order-status order-status-${escapeHTML(status)}">${formatStatus(status)}</span>
            </div>
            <div class="account-order-body">
                <div class="account-order-meta">
                    <span>${itemCount} ${itemCount === 1 ? "item" : "items"}</span>
                    <span>Payment: ${formatStatus(paymentStatus)}</span>
                    <strong>${total}</strong>
                </div>
                <div class="account-order-items">
                    ${items.slice(0, 4).map(item => createOrderItem(item)).join("")}
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
                <img src="${escapeHTML(image)}" alt="${name}" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="account-order-item-info">
                <strong>${name}</strong>
                <span>Qty: ${quantity}</span>
            </div>
        </div>
    `;
}

function setupTabs() {
    document.querySelectorAll("[data-account-tab]").forEach(tab => {
        tab.addEventListener("click", event => {
            event.preventDefault();
            const id = tab.getAttribute("data-account-tab");

            document.querySelectorAll("[data-account-tab]").forEach(item => {
                item.classList.toggle("active", item === tab);
            });

            document.querySelectorAll("[data-account-section]").forEach(section => {
                section.hidden = section.getAttribute("data-account-section") !== id;
            });
        });
    });

    document.querySelector("[data-edit-address]")?.addEventListener("click", () => {
        document.querySelector('[data-account-tab="profile"]')?.click();
        document.querySelector("[data-profile-address]")?.focus();
    });
}

function setupAccountActions() {
    const profileForm = document.querySelector("[data-profile-form]");
    profileForm?.addEventListener("submit", handleProfileUpdate);

    document.querySelectorAll("[data-logout], [data-logout-button]").forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();
            try {
                await logoutUser();
                window.location.href = "index.html";
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
    const button = form.querySelector("[data-profile-submit], button[type='submit']");
    const firstName = form.querySelector("[data-profile-first-name]")?.value.trim()
        || (form.querySelector("[data-profile-name]")?.value.trim() || "").split(" ")[0];
    const lastName = form.querySelector("[data-profile-last-name]")?.value.trim()
        || (form.querySelector("[data-profile-name]")?.value.trim() || "").split(" ").slice(1).join(" ");
    const phone = form.querySelector("[data-profile-phone]")?.value.trim() || "";
    const address = form.querySelector("[data-profile-address]")?.value.trim() || "";
    const city = form.querySelector("[data-profile-city]")?.value.trim() || "";
    const state = form.querySelector("[data-profile-state]")?.value.trim() || "";
    const postalCode = form.querySelector("[data-profile-postal]")?.value.trim() || "";
    const country = form.querySelector("[data-profile-country]")?.value.trim() || "";

    if (!firstName) {
        showToast("Please enter your name.", "error");
        return;
    }

    const user = await whenAuthReady();

    if (!user) {
        window.location.href = "login.html?redirect=account.html";
        return;
    }

    try {
        setLoading(button, true, "Saving...");

        await updateUserProfile(user.uid, {
            firstName,
            lastName,
            phone,
            address,
            city,
            state,
            postalCode,
            country
        });

        showToast("Profile updated successfully.", "success");
        await loadAccount(user);
    } catch (error) {
        console.error("Profile update error:", error);
        showToast("Unable to update your profile.", "error");
    } finally {
        setLoading(button, false);
    }
}

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}

function formatStatus(status) {
    return String(status)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, character => character.toUpperCase());
}

function formatOrderDate(timestamp) {
    if (!timestamp) {
        return "Date unavailable";
    }

    try {
        const date = typeof timestamp.toDate === "function"
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
