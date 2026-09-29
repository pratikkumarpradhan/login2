/* =========================================================
   PROJECTKART
   Admin bill history + monthly analytics (Firestore realtime)
   ========================================================= */

import { guardAdminPage } from "./admin-guard.js";
import { formatPrice, showToast } from "../utils.js";
import {
    buildMonthlyAnalytics,
    deleteBill,
    getBillById,
    getCurrentMonthStats,
    migrateLocalBillsIfNeeded,
    updateBill,
    watchBills
} from "./billing-storage.js";
import { downloadInvoicePdfFromBill, invoiceFileName } from "./invoice-pdf.js";
import { buildCustomerInvoiceHTML } from "./invoice-render.js";

let activeBillId = null;
let editBillId = null;
let editItems = [];
let searchQuery = "";
let cachedBills = [];
let unsubscribeBills = null;

document.addEventListener("DOMContentLoaded", () => {
    initBillsPage();
});

window.addEventListener("beforeunload", () => {
    if (typeof unsubscribeBills === "function") unsubscribeBills();
});

async function initBillsPage() {
    const user = await guardAdminPage();
    if (!user) return;

    bindEvents();
    setHistoryLoading(true);

    try {
        const migration = await migrateLocalBillsIfNeeded();
        if (migration.migrated && migration.count > 0) {
            showToast(`Migrated ${migration.count} local bill(s) to Firebase`, "success");
        }
    } catch (error) {
        console.warn("Bill migration skipped:", error);
    }

    unsubscribeBills = watchBills(
        bills => {
            cachedBills = Array.isArray(bills) ? bills : [];
            setHistoryLoading(false);
            renderAnalytics();
            renderHistory();
        },
        error => {
            setHistoryLoading(false);
            console.error("Realtime bills error:", error);
            const message = error?.code === "permission-denied"
                ? "Permission denied reading bills. Deploy Firestore rules for bills."
                : (error.message || "Unable to load bills from Firebase.");
            showToast(message, "error");
            const body = document.querySelector("[data-bills-table]");
            if (body) {
                body.innerHTML = `<tr><td colspan="7" class="bills-empty">${escapeHtml(message)}</td></tr>`;
            }
        }
    );
}

function setHistoryLoading(isLoading) {
    const body = document.querySelector("[data-bills-table]");
    if (!body || !isLoading) return;
    body.innerHTML = `<tr><td colspan="7" class="bills-empty">Loading bills from Firebase…</td></tr>`;
}

function bindEvents() {
    document.querySelectorAll("[data-close-bill-view]").forEach(btn => {
        btn.addEventListener("click", closeViewer);
    });

    document.querySelectorAll("[data-close-bill-edit]").forEach(btn => {
        btn.addEventListener("click", closeEditor);
    });

    document.querySelector("[data-view-download]")?.addEventListener("click", () => {
        downloadActiveBill().catch(error => {
            console.error("Download bill error:", error);
            showToast(error.message || "Unable to download PDF.", "error");
        });
    });

    document.querySelector("[data-bills-search]")?.addEventListener("input", event => {
        searchQuery = String(event.currentTarget.value || "").trim().toLowerCase();
        renderHistory();
    });

    document.querySelector("[data-bills-table]")?.addEventListener("click", event => {
        const view = event.target.closest("[data-view-bill]");
        if (view) {
            openViewer(view.getAttribute("data-view-bill"));
            return;
        }

        const edit = event.target.closest("[data-edit-bill]");
        if (edit) {
            openEditor(edit.getAttribute("data-edit-bill"));
            return;
        }

        const downloadBtn = event.target.closest("[data-download-bill]");
        if (downloadBtn) {
            downloadBillById(downloadBtn.getAttribute("data-download-bill")).catch(error => {
                console.error("Download bill error:", error);
                showToast(error.message || "Unable to download PDF.", "error");
            });
            return;
        }

        const remove = event.target.closest("[data-delete-bill]");
        if (remove) {
            handleDelete(remove.getAttribute("data-delete-bill"));
        }
    });

    document.querySelector("[data-bill-edit-form]")?.addEventListener("submit", event => {
        event.preventDefault();
        handleEditSave().catch(error => {
            console.error("Edit bill error:", error);
            showToast(error.message || "Unable to update bill.", "error");
        });
    });

    document.querySelector("[data-edit-items]")?.addEventListener("input", event => {
        const input = event.target.closest("[data-edit-qty]");
        if (!input) return;
        const index = Number(input.getAttribute("data-edit-qty"));
        const qty = Math.max(1, Math.floor(Number(input.value) || 1));
        input.value = String(qty);
        if (!editItems[index]) return;
        editItems[index].quantity = qty;
        recalculateEditItem(editItems[index]);
        renderEditItems();
        updateEditTotals();
    });

    document.querySelector("[data-edit-items]")?.addEventListener("click", event => {
        const remove = event.target.closest("[data-edit-remove]");
        if (!remove) return;
        const index = Number(remove.getAttribute("data-edit-remove"));
        editItems.splice(index, 1);
        renderEditItems();
        updateEditTotals();
    });
}

function findBill(billId) {
    return cachedBills.find(bill => bill.id === billId) || null;
}

function renderAnalytics() {
    const bills = cachedBills;
    const current = getCurrentMonthStats(bills);
    const monthly = buildMonthlyAnalytics(bills);

    setText("[data-month-label]", current.label || "Overview");
    setText("[data-stat-sales]", formatPrice(current.sales));
    setText("[data-stat-profit]", formatPrice(current.profit));
    setText("[data-stat-bills]", String(current.bills));
    setText("[data-stat-items]", String(current.itemsSold));

    renderChart("[data-chart-sales]", monthly, "sales", false);
    renderChart("[data-chart-profit]", monthly, "profit", true);
}

function renderChart(selector, monthly, field, gold) {
    const root = document.querySelector(selector);
    if (!root) return;

    if (!monthly.length) {
        root.innerHTML = `<div class="bills-chart-empty">No billing data yet.</div>`;
        return;
    }

    const max = Math.max(...monthly.map(item => Number(item[field]) || 0), 1);
    root.innerHTML = monthly.slice(-8).map(item => {
        const value = Number(item[field]) || 0;
        const height = Math.max(4, Math.round((value / max) * 100));
        return `
            <div class="bills-chart__col" title="${escapeAttr(item.label)}: ${formatPrice(value)}">
                <div class="bills-chart__bar${gold ? " bills-chart__bar--gold" : ""}" style="height:${height}%"></div>
                <div class="bills-chart__label">${escapeHtml(item.label.replace(/ /g, "\n").split("\n")[0])}</div>
            </div>
        `;
    }).join("");
}

function getFilteredBills() {
    if (!searchQuery) return cachedBills;

    return cachedBills.filter(bill => {
        const hay = [
            bill.invoiceNumber,
            bill.customerName,
            bill.customerPhone,
            bill.customerAddress,
            bill.paymentMethod
        ].join(" ").toLowerCase();
        return hay.includes(searchQuery);
    });
}

function renderHistory() {
    const body = document.querySelector("[data-bills-table]");
    const countEl = document.querySelector("[data-bills-count]");
    if (!body) return;

    const bills = getFilteredBills();
    const totalCount = cachedBills.length;

    if (countEl) {
        countEl.textContent = searchQuery
            ? `${bills.length} of ${totalCount} bills`
            : `${totalCount} bill${totalCount === 1 ? "" : "s"}`;
    }

    if (!bills.length) {
        body.innerHTML = `
            <tr>
                <td colspan="7" class="bills-empty">
                    ${searchQuery ? "No bills match your search." : "No bills in Firebase yet. Save one from the Bill page."}
                </td>
            </tr>`;
        return;
    }

    body.innerHTML = bills.map(bill => {
        const date = new Date(bill.invoiceDate || bill.createdAt);
        const dateLabel = Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
        const itemCount = Number(bill.itemsSold) || (bill.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        return `
            <tr>
                <td>
                    <div class="bills-invoice-cell">
                        <strong>${escapeHtml(bill.invoiceNumber)}</strong>
                        <small>${itemCount} item${itemCount === 1 ? "" : "s"}</small>
                    </div>
                </td>
                <td>${escapeHtml(dateLabel)}</td>
                <td>
                    <div class="bills-customer-cell">
                        <strong>${escapeHtml(bill.customerName || "—")}</strong>
                        <small>${escapeHtml(bill.customerPhone || "")}</small>
                    </div>
                </td>
                <td><span class="bills-payment-chip">${escapeHtml(bill.paymentMethod || "Cash / UPI / Bank Transfer")}</span></td>
                <td class="bills-money">${formatPrice(bill.totalAmount)}</td>
                <td class="bills-money bills-money--profit">${formatPrice(bill.totalProfit)}</td>
                <td>
                    <div class="bills-row-actions">
                        <button type="button" class="admin-table-action" data-view-bill="${escapeAttr(bill.id)}">View</button>
                        <button type="button" class="admin-table-action admin-table-action--edit" data-edit-bill="${escapeAttr(bill.id)}">Edit</button>
                        <button type="button" class="admin-table-action" data-download-bill="${escapeAttr(bill.id)}">Download</button>
                        <button type="button" class="admin-table-action admin-table-action--danger" data-delete-bill="${escapeAttr(bill.id)}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function openViewer(billId) {
    let bill = findBill(billId);
    if (!bill) {
        bill = await getBillById(billId);
    }
    if (!bill) {
        showToast("Bill not found.", "error");
        return;
    }

    activeBillId = billId;
    const modal = document.getElementById("billViewModal");
    const body = document.querySelector("[data-bill-view-body]");
    setText("[data-view-title]", bill.invoiceNumber);
    if (body) body.innerHTML = buildCustomerInvoiceHTML(bill);

    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
}

function closeViewer() {
    const modal = document.getElementById("billViewModal");
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
    activeBillId = null;
}

async function openEditor(billId) {
    let bill = findBill(billId);
    if (!bill) {
        bill = await getBillById(billId);
    }
    if (!bill) {
        showToast("Bill not found.", "error");
        return;
    }

    editBillId = billId;
    editItems = (bill.items || []).map(item => {
        const row = {
            productId: item.productId,
            productName: item.productName,
            type: item.type || "component",
            sellingPrice: Number(item.sellingPrice) || 0,
            originalPrice: Number(item.originalPrice) || 0,
            quantity: Math.max(1, Number(item.quantity) || 1),
            lineTotal: 0,
            lineProfit: 0
        };
        recalculateEditItem(row);
        return row;
    });

    setValue("[data-edit-bill-id]", bill.id);
    setText("[data-edit-invoice-label]", `· ${bill.invoiceNumber}`);
    setValue("[data-edit-customer-name]", bill.customerName || "");
    setValue("[data-edit-customer-phone]", bill.customerPhone || "");
    setValue("[data-edit-customer-address]", bill.customerAddress || "");
    setValue("[data-edit-payment-method]", bill.paymentMethod || "Cash / UPI / Bank Transfer");

    const date = new Date(bill.invoiceDate || bill.createdAt);
    if (!Number.isNaN(date.getTime())) {
        setValue("[data-edit-invoice-date]", date.toISOString().slice(0, 10));
    } else {
        setValue("[data-edit-invoice-date]", "");
    }

    renderEditItems();
    updateEditTotals();

    const modal = document.getElementById("billEditModal");
    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
}

function closeEditor() {
    const modal = document.getElementById("billEditModal");
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
    editBillId = null;
    editItems = [];
}

function renderEditItems() {
    const list = document.querySelector("[data-edit-items]");
    if (!list) return;

    if (!editItems.length) {
        list.innerHTML = `<div class="bills-edit-empty">No items on this bill.</div>`;
        return;
    }

    list.innerHTML = `
        <table class="bills-edit-table">
            <thead>
                <tr>
                    <th>SL.</th>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${editItems.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <strong>${escapeHtml(item.productName)}</strong>
                            <small>${item.type === "projectKit" ? "Project Kit" : "Component"}</small>
                        </td>
                        <td>${formatPrice(item.sellingPrice)}</td>
                        <td>
                            <input type="number" min="1" step="1" value="${item.quantity}" data-edit-qty="${index}" aria-label="Quantity">
                        </td>
                        <td>${formatPrice(item.lineTotal)}</td>
                        <td>
                            <button type="button" class="admin-table-action admin-table-action--danger" data-edit-remove="${index}">Remove</button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function recalculateEditItem(item) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const sell = Number(item.sellingPrice) || 0;
    const cost = Number(item.originalPrice) || 0;
    item.quantity = qty;
    item.lineTotal = roundMoney(sell * qty);
    item.lineProfit = roundMoney((sell - cost) * qty);
}

function updateEditTotals() {
    const totalAmount = roundMoney(editItems.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0));
    const totalOriginalCost = roundMoney(editItems.reduce((sum, item) => sum + ((Number(item.originalPrice) || 0) * (Number(item.quantity) || 0)), 0));
    const totalProfit = roundMoney(totalAmount - totalOriginalCost);

    setText("[data-edit-total]", formatPrice(totalAmount));
    setText("[data-edit-profit]", formatPrice(totalProfit));

    return { totalAmount, totalOriginalCost, totalProfit };
}

async function handleEditSave() {
    if (!editBillId) throw new Error("No bill selected.");

    const customerName = valueOf("[data-edit-customer-name]");
    const customerPhone = valueOf("[data-edit-customer-phone]");
    const customerAddress = valueOf("[data-edit-customer-address]");
    const paymentMethod = valueOf("[data-edit-payment-method]") || "Cash / UPI / Bank Transfer";
    const dateValue = valueOf("[data-edit-invoice-date]");

    if (!customerName) throw new Error("Customer name is required.");
    if (!customerPhone) throw new Error("Customer phone is required.");
    if (!editItems.length) throw new Error("Add at least one item, or delete this bill.");

    const { totalAmount, totalOriginalCost, totalProfit } = updateEditTotals();
    const invoiceDate = dateValue
        ? new Date(`${dateValue}T12:00:00`).toISOString()
        : new Date().toISOString();

    await updateBill(editBillId, {
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        invoiceDate,
        items: editItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            type: item.type,
            sellingPrice: Number(item.sellingPrice) || 0,
            originalPrice: Number(item.originalPrice) || 0,
            quantity: Number(item.quantity) || 1,
            lineTotal: Number(item.lineTotal) || 0,
            lineProfit: Number(item.lineProfit) || 0
        })),
        totalAmount,
        totalOriginalCost,
        totalProfit
    });

    showToast("Bill updated in Firebase", "success");
    closeEditor();
    // Realtime listener refreshes UI automatically
}

async function handleDelete(billId) {
    const bill = findBill(billId) || await getBillById(billId);
    if (!bill) return;

    const ok = window.confirm(`Delete invoice ${bill.invoiceNumber} from Firebase?\n\nThis cannot be undone.`);
    if (!ok) return;

    try {
        await deleteBill(billId);
        if (activeBillId === billId) closeViewer();
        if (editBillId === billId) closeEditor();
        showToast(`Deleted ${bill.invoiceNumber}`, "success");
    } catch (error) {
        console.error("Delete bill error:", error);
        showToast(error.message || "Unable to delete bill.", "error");
    }
}

async function downloadActiveBill() {
    if (!activeBillId) {
        throw new Error("Open a bill first.");
    }
    await downloadBillById(activeBillId);
}

async function downloadBillById(billId) {
    let bill = findBill(billId);
    if (!bill) bill = await getBillById(billId);
    if (!bill) throw new Error("Bill not found.");

    const btn = document.querySelector(`[data-download-bill="${CSS.escape(billId)}"]`)
        || document.querySelector("[data-view-download]");
    const originalLabel = btn?.textContent;

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Downloading…";
    }

    try {
        await downloadInvoicePdfFromBill(bill, invoiceFileName(bill.invoiceNumber));
        showToast(`Downloaded ${invoiceFileName(bill.invoiceNumber)}`, "success");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalLabel || "Download";
        }
    }
}

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function valueOf(selector) {
    return document.querySelector(selector)?.value.trim() || "";
}

function setValue(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.value = value ?? "";
}

function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value ?? "";
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
}
