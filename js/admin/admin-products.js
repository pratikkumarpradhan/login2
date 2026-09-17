/* =========================================================
   PROJECTKART
   Admin components list (products.html)
   ========================================================= */

import {
    deleteComponent,
    getAllComponents,
    setComponentActive,
    setComponentFeatured
} from "../components.js";

import {
    getCategories,
    getAllCategories
} from "../categories.js";

import {
    escapeHTML,
    formatPrice
} from "../utils.js";

import {
    guardAdminPage
} from "./admin-guard.js";

let components = [];
let filtered = [];
let page = 1;
const PAGE_SIZE = 10;
let selected = new Set();

document.addEventListener("DOMContentLoaded", () => {
    initAdminProducts();
});

async function initAdminProducts() {
    if (!document.querySelector("[data-products-table-body]")) {
        return;
    }

    await guardAdminPage();
    await loadCategoryFilter();
    bindFilters();
    await refresh();
}

async function loadCategoryFilter() {
    const select = document.querySelector("[data-products-category]");
    if (!select) return;

    let categories = [];
    try {
        categories = await getAllCategories();
        if (!categories.length) categories = await getCategories();
    } catch (error) {
        console.error("Admin category filter error:", error);
        categories = await getCategories();
    }

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

function bindFilters() {
    ["data-products-search", "data-products-category", "data-products-status", "data-products-sort"]
        .forEach(attr => {
            document.querySelector(`[${attr}]`)?.addEventListener("input", () => {
                page = 1;
                applyFilters();
            });
            document.querySelector(`[${attr}]`)?.addEventListener("change", () => {
                page = 1;
                applyFilters();
            });
        });

    document.querySelector("[data-admin-refresh-products]")?.addEventListener("click", refresh);
    document.querySelector("[data-products-clear-filters]")?.addEventListener("click", clearFilters);
    document.querySelector("[data-products-prev]")?.addEventListener("click", () => {
        page = Math.max(1, page - 1);
        renderTable();
    });
    document.querySelector("[data-products-next]")?.addEventListener("click", () => {
        const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        page = Math.min(maxPage, page + 1);
        renderTable();
    });

    document.querySelector("[data-products-select-all]")?.addEventListener("change", event => {
        const checked = event.currentTarget.checked;
        const pageItems = getPageItems();
        pageItems.forEach(item => {
            if (checked) selected.add(item.id);
            else selected.delete(item.id);
        });
        renderTable();
    });

    document.querySelector("[data-products-bulk-show]")?.addEventListener("click", () => bulkActive(true));
    document.querySelector("[data-products-bulk-hide]")?.addEventListener("click", () => bulkActive(false));
    document.querySelector("[data-products-bulk-delete]")?.addEventListener("click", bulkDelete);

    document.querySelector("[data-products-table-body]")?.addEventListener("click", handleRowAction);
    document.querySelector("[data-products-table-body]")?.addEventListener("change", handleRowSelect);
}

async function refresh() {
    setLoading(true);
    try {
        components = await getAllComponents();
        applyFilters();
        updateStats();
    } catch (error) {
        console.error("Admin products load error:", error);
        components = [];
        applyFilters();
    } finally {
        setLoading(false);
    }
}

function clearFilters() {
    const search = document.querySelector("[data-products-search]");
    const category = document.querySelector("[data-products-category]");
    const status = document.querySelector("[data-products-status]");
    const sort = document.querySelector("[data-products-sort]");
    if (search) search.value = "";
    if (category) category.value = "";
    if (status) status.value = "";
    if (sort) sort.value = "newest";
    page = 1;
    applyFilters();
}

function applyFilters() {
    const search = (document.querySelector("[data-products-search]")?.value || "").toLowerCase().trim();
    const category = document.querySelector("[data-products-category]")?.value || "";
    const status = document.querySelector("[data-products-status]")?.value || "";
    const sort = document.querySelector("[data-products-sort]")?.value || "newest";

    filtered = components.filter(item => {
        const matchesSearch = !search
            || `${item.name} ${item.description} ${item.categoryName}`.toLowerCase().includes(search);
        const matchesCategory = !category || item.categoryId === category;
        const matchesStatus = !status
            || (status === "active" && item.active !== false)
            || (status === "hidden" && item.active === false);
        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sort === "price-low") filtered.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "price-high") filtered.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === "name") filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    else if (sort === "stock") filtered.sort((a, b) => Number(a.stock) - Number(b.stock));
    else filtered.sort((a, b) => String(b.id).localeCompare(String(a.id)));

    renderTable();
}

function updateStats() {
    setText("[data-products-total]", components.length);
    setText("[data-products-active]", components.filter(item => item.active !== false).length);
    setText("[data-products-hidden]", components.filter(item => item.active === false).length);
    setText("[data-products-low-stock]", components.filter(item => Number(item.stock) > 0 && Number(item.stock) < 10).length);
    setText("[data-products-out-stock]", components.filter(item => Number(item.stock) <= 0).length);
}

function getPageItems() {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
}

function renderTable() {
    const body = document.querySelector("[data-products-table-body]");
    const empty = document.querySelector("[data-products-empty]");
    const results = document.querySelector("[data-products-results]");
    const pageLabel = document.querySelector("[data-products-page]");
    const prev = document.querySelector("[data-products-prev]");
    const next = document.querySelector("[data-products-next]");
    const bulkBar = document.querySelector("[data-products-bulk-bar]");
    const selectedCount = document.querySelector("[data-products-selected-count]");

    if (!body) return;

    const pageItems = getPageItems();
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    if (results) results.textContent = `Showing ${filtered.length} components`;
    if (pageLabel) pageLabel.textContent = String(page);
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= maxPage;
    if (selectedCount) selectedCount.textContent = String(selected.size);
    if (bulkBar) bulkBar.hidden = selected.size === 0;

    if (!filtered.length) {
        body.innerHTML = "";
        if (empty) empty.hidden = false;
        return;
    }

    if (empty) empty.hidden = true;

    body.innerHTML = pageItems.map(item => {
        const active = item.active !== false;
        const stock = Number(item.stock || 0);
        return `
            <tr data-product-row="${escapeHTML(item.id)}">
                <td>
                    <input type="checkbox" data-product-select="${escapeHTML(item.id)}" ${selected.has(item.id) ? "checked" : ""}>
                </td>
                <td>
                    <div class="admin-table-product">
                        <div class="admin-table-product__image">
                            <img src="${escapeHTML(item.image || "")}" alt="" loading="lazy">
                        </div>
                        <div class="admin-table-product__content">
                            <div class="admin-table-product__name">${escapeHTML(item.name)}</div>
                            <div class="admin-table-product__meta">${escapeHTML(item.badge || "Component")}</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHTML(item.categoryName || "—")}</td>
                <td>
                    <div class="admin-table-price">${formatPrice(item.price)}</div>
                    ${Number(item.oldPrice) > Number(item.price) ? `<div class="admin-table-old-price">${formatPrice(item.oldPrice)}</div>` : ""}
                </td>
                <td>
                    <div class="admin-stock ${stock <= 0 ? "admin-stock--out" : stock < 10 ? "admin-stock--low" : "admin-stock--in"}">
                        <span class="admin-stock__dot"></span>
                        <span class="admin-stock__text">${stock}</span>
                    </div>
                </td>
                <td>
                    <span class="admin-status ${active ? "admin-status--active" : "admin-status--inactive"}">
                        <span class="admin-status__dot"></span>
                        ${active ? "Active" : "Hidden"}
                    </span>
                </td>
                <td>${item.featured ? "Yes" : "No"}</td>
                <td>—</td>
                <td>
                    <div class="admin-table-actions">
                        <a class="admin-table-action admin-table-action--edit" href="product-edit.html?id=${encodeURIComponent(item.id)}">Edit</a>
                        <button type="button" class="admin-table-action" data-product-toggle-active="${escapeHTML(item.id)}">${active ? "Hide" : "Show"}</button>
                        <button type="button" class="admin-table-action" data-product-toggle-featured="${escapeHTML(item.id)}">${item.featured ? "Unfeature" : "Feature"}</button>
                        <button type="button" class="admin-table-action admin-table-action--danger" data-product-delete="${escapeHTML(item.id)}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function handleRowAction(event) {
    const deleteId = event.target.closest("[data-product-delete]")?.getAttribute("data-product-delete");
    const activeId = event.target.closest("[data-product-toggle-active]")?.getAttribute("data-product-toggle-active");
    const featuredId = event.target.closest("[data-product-toggle-featured]")?.getAttribute("data-product-toggle-featured");

    try {
        if (deleteId) {
            if (!window.confirm("Delete this component permanently?")) return;
            await deleteComponent(deleteId);
            selected.delete(deleteId);
            await refresh();
            return;
        }

        if (activeId) {
            const item = components.find(entry => entry.id === activeId);
            await setComponentActive(activeId, !(item?.active !== false));
            await refresh();
            return;
        }

        if (featuredId) {
            const item = components.find(entry => entry.id === featuredId);
            await setComponentFeatured(featuredId, !item?.featured);
            await refresh();
        }
    } catch (error) {
        console.error("Admin product action error:", error);
        window.alert(error.message || "Unable to update component.");
    }
}

function handleRowSelect(event) {
    const checkbox = event.target.closest("[data-product-select]");
    if (!checkbox) return;
    const id = checkbox.getAttribute("data-product-select");
    if (checkbox.checked) selected.add(id);
    else selected.delete(id);
    renderTable();
}

async function bulkActive(active) {
    try {
        await Promise.all([...selected].map(id => setComponentActive(id, active)));
        selected.clear();
        await refresh();
    } catch (error) {
        console.error("Bulk active error:", error);
    }
}

async function bulkDelete() {
    if (!window.confirm(`Delete ${selected.size} components permanently?`)) return;
    try {
        await Promise.all([...selected].map(id => deleteComponent(id)));
        selected.clear();
        await refresh();
    } catch (error) {
        console.error("Bulk delete error:", error);
    }
}

function setLoading(isLoading) {
    const loading = document.querySelector("[data-products-loading]");
    if (loading) loading.hidden = !isLoading;
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = String(value);
}
