/* =========================================================
   PROJECTKART
   Admin bill history + monthly analytics
   ========================================================= */

import { guardAdminPage } from "./admin-guard.js";
import { formatPrice, showToast } from "../utils.js";
import {
    buildMonthlyAnalytics,
    getAllBills,
    getBillById,
    getCurrentMonthStats
} from "./billing-storage.js";
import { downloadInvoicePdfFromBill, invoiceFileName } from "./invoice-pdf.js";
import { buildCustomerInvoiceHTML } from "./invoice-render.js";

let activeBillId = null;

document.addEventListener("DOMContentLoaded", () => {
    initBillsPage();
});

async function initBillsPage() {
    const user = await guardAdminPage();
    if (!user) return;

    renderAnalytics();
    renderHistory();
    bindEvents();
}

function bindEvents() {
    document.querySelectorAll("[data-close-bill-view]").forEach(btn => {
        btn.addEventListener("click", closeViewer);
    });

    document.querySelector("[data-view-download]")?.addEventListener("click", () => {
        downloadActiveBill().catch(error => {
            console.error("Download bill error:", error);
            showToast(error.message || "Unable to download PDF.", "error");
        });
    });

    document.querySelector("[data-bills-table]")?.addEventListener("click", event => {
        const view = event.target.closest("[data-view-bill]");
        if (view) {
            openViewer(view.getAttribute("data-view-bill"));
            return;
        }

        const downloadBtn = event.target.closest("[data-download-bill]");
        if (downloadBtn) {
            downloadBillById(downloadBtn.getAttribute("data-download-bill")).catch(error => {
                console.error("Download bill error:", error);
                showToast(error.message || "Unable to download PDF.", "error");
            });
        }
    });
}

function renderAnalytics() {
    const bills = getAllBills();
    const current = getCurrentMonthStats(bills);
    const monthly = buildMonthlyAnalytics(bills);

    setText("[data-month-label]", current.label || "This month");
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
        root.innerHTML = `<div class="invoice-empty" style="grid-column:1/-1;">No billing data yet.</div>`;
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

function renderHistory() {
    const body = document.querySelector("[data-bills-table]");
    if (!body) return;

    const bills = getAllBills();
    if (!bills.length) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#8b97ab;padding:28px;">No bills saved yet.</td></tr>`;
        return;
    }

    body.innerHTML = bills.map(bill => {
        const date = new Date(bill.invoiceDate || bill.createdAt);
        const dateLabel = Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

        return `
            <tr>
                <td><strong>${escapeHtml(bill.invoiceNumber)}</strong></td>
                <td>${escapeHtml(dateLabel)}</td>
                <td>
                    <div>${escapeHtml(bill.customerName || "—")}</div>
                    <div style="color:#8b97ab;font-size:12px;">${escapeHtml(bill.customerPhone || "")}</div>
                </td>
                <td>${formatPrice(bill.totalAmount)}</td>
                <td style="color:#48c98b;">${formatPrice(bill.totalProfit)}</td>
                <td>
                    <div class="admin-table-actions">
                        <button type="button" class="admin-table-action" data-view-bill="${escapeAttr(bill.id)}">View</button>
                        <button type="button" class="admin-table-action" data-download-bill="${escapeAttr(bill.id)}">Download</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function openViewer(billId) {
    const bill = getBillById(billId);
    if (!bill) return;

    activeBillId = billId;
    const modal = document.getElementById("billViewModal");
    const body = document.querySelector("[data-bill-view-body]");
    setText("[data-view-title]", bill.invoiceNumber);
    if (body) body.innerHTML = buildCustomerInvoiceHTML(bill);

    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
}

async function downloadActiveBill() {
    if (!activeBillId) {
        throw new Error("Open a bill first.");
    }
    await downloadBillById(activeBillId);
}

async function downloadBillById(billId) {
    const bill = getBillById(billId);
    if (!bill) {
        throw new Error("Bill not found.");
    }

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

function closeViewer() {
    const modal = document.getElementById("billViewModal");
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
    activeBillId = null;
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
