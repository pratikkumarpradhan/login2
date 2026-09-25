/* =========================================================
   PROJECTKART
   Admin billing / invoice editor
   ========================================================= */

import { guardAdminPage } from "./admin-guard.js";
import { getAllComponents, getComponents } from "../components.js";
import { getAllKits, getKits } from "../kits.js";
import { formatPrice, showToast } from "../utils.js";
import {
    getBillingSettings,
    getPaymentQrSrc,
    peekNextInvoiceNumber,
    saveBill,
    saveBillingSettings
} from "./billing-storage.js";
import { downloadInvoicePdfFromBill, invoiceFileName } from "./invoice-pdf.js";

let items = [];
let catalog = { components: [], kits: [] };
let pickerTab = "component";
let pickerQuery = "";
let billLocked = false;

document.addEventListener("DOMContentLoaded", () => {
    initBillingPage();
});

async function initBillingPage() {
    const user = await guardAdminPage();
    if (!user) return;

    bindChrome();
    hydrateSettings();
    resetBillForm();
    await loadCatalog();
    renderPickerList();
}

function bindChrome() {
    document.querySelectorAll("[data-open-picker]").forEach(btn => {
        btn.addEventListener("click", openPicker);
    });
    document.querySelectorAll("[data-close-picker]").forEach(btn => {
        btn.addEventListener("click", closePicker);
    });

    document.querySelectorAll("[data-picker-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            pickerTab = btn.getAttribute("data-picker-tab") || "component";
            document.querySelectorAll("[data-picker-tab]").forEach(item => {
                item.classList.toggle("is-active", item === btn);
            });
            renderPickerList();
        });
    });

    document.querySelector("[data-picker-search]")?.addEventListener("input", event => {
        pickerQuery = String(event.currentTarget.value || "").trim().toLowerCase();
        renderPickerList();
    });

    document.querySelector("[data-billing-save]")?.addEventListener("click", handleSave);
    document.querySelector("[data-billing-download]")?.addEventListener("click", () => {
        handleDownload().catch(error => {
            console.error("Download bill error:", error);
            setStatus(error.message || "Unable to download PDF.", "error");
            showToast(error.message || "Unable to download PDF.", "error");
        });
    });
    document.querySelector("[data-billing-new]")?.addEventListener("click", () => {
        if (items.length && !window.confirm("Start a new bill? Unsaved items will be cleared.")) {
            return;
        }
        resetBillForm();
    });

    document.querySelector("[data-settings-save]")?.addEventListener("click", () => {
        const settings = saveBillingSettings({
            qrImagePath: valueOf("[data-settings-qr-path]") || "../assets/images/upi-qr.png"
        });
        applyBusinessHeader(settings);
        updateTotals();
        setStatus("Payment QR image settings saved.", "success");
        showToast("QR image settings saved", "success");
    });

    document.querySelector("[data-settings-qr-file]")?.addEventListener("change", async event => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast("Please choose a PNG or image file.", "error");
            return;
        }
        try {
            const dataUrl = await readFileAsDataUrl(file);
            const settings = saveBillingSettings({ qrImageData: dataUrl });
            updateTotals();
            setStatus("QR image uploaded for invoices.", "success");
            showToast("QR image uploaded", "success");
            const preview = document.querySelector("[data-settings-qr-preview]");
            if (preview) {
                preview.src = getPaymentQrSrc(settings);
                preview.hidden = false;
            }
        } catch (error) {
            console.error("QR upload error:", error);
            showToast("Unable to upload QR image.", "error");
        }
    });

    document.querySelector("[data-settings-qr-clear]")?.addEventListener("click", () => {
        const settings = saveBillingSettings({ qrImageData: "" });
        updateTotals();
        const preview = document.querySelector("[data-settings-qr-preview]");
        const src = getPaymentQrSrc(settings);
        if (preview) {
            preview.src = src;
            preview.hidden = !src;
            preview.onerror = () => {
                preview.hidden = true;
            };
        }
        const fileInput = document.querySelector("[data-settings-qr-file]");
        if (fileInput) fileInput.value = "";
        showToast("Using default QR image path", "success");
    });

    document.querySelector("[data-invoice-rows]")?.addEventListener("input", event => {
        const input = event.target.closest("[data-qty]");
        if (!input) return;
        const index = Number(input.getAttribute("data-qty"));
        const qty = Math.max(1, Math.floor(Number(input.value) || 1));
        input.value = String(qty);
        if (!items[index]) return;
        items[index].quantity = qty;
        recalculateItem(items[index]);
        renderRows();
        updateTotals();
    });

    document.querySelector("[data-invoice-rows]")?.addEventListener("click", event => {
        const remove = event.target.closest("[data-remove-row]");
        if (!remove) return;
        const index = Number(remove.getAttribute("data-remove-row"));
        items.splice(index, 1);
        renderRows();
        updateTotals();
    });

    ["[data-customer-name]", "[data-customer-phone]", "[data-customer-address]", "[data-payment-method]"].forEach(selector => {
        document.querySelector(selector)?.addEventListener("input", () => setStatus(""));
    });
}

async function loadCatalog() {
    try {
        const [components, kits] = await Promise.all([
            getAllComponents().catch(() => getComponents()),
            getAllKits().catch(() => getKits())
        ]);
        catalog.components = Array.isArray(components) ? components : [];
        catalog.kits = Array.isArray(kits) ? kits : [];
    } catch (error) {
        console.error("Billing catalog load error:", error);
        catalog.components = [];
        catalog.kits = [];
        setStatus("Unable to load products. Check your connection.", "error");
    }
}

function hydrateSettings() {
    const settings = getBillingSettings();
    applyBusinessHeader(settings);
    setValue("[data-settings-qr-path]", settings.qrImagePath || "../assets/images/upi-qr.png");
    const preview = document.querySelector("[data-settings-qr-preview]");
    const src = getPaymentQrSrc(settings);
    if (preview && src) {
        preview.src = src;
        preview.hidden = false;
        preview.onerror = () => {
            preview.hidden = true;
        };
    }
}

function applyBusinessHeader(settings) {
    setText("[data-biz-name]", settings.businessName);
    setText("[data-biz-tagline]", settings.tagline);
    setText("[data-biz-address]", settings.address);
    setText("[data-biz-phone]", settings.phone);
}

function resetBillForm() {
    billLocked = false;
    items = [];
    setValue("[data-customer-name]", "");
    setValue("[data-customer-address]", "");
    setValue("[data-customer-phone]", "");
    setValue("[data-payment-method]", "Cash / UPI / Bank Transfer");
    setText("[data-invoice-number]", peekNextInvoiceNumber());
    setText("[data-invoice-date]", formatDate(new Date()));
    setInputsDisabled(false);
    renderRows();
    updateTotals();
    setStatus("Ready to create a bill.", "info");
}

function setInputsDisabled(disabled) {
    ["[data-customer-name]", "[data-customer-address]", "[data-customer-phone]", "[data-payment-method]"].forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.disabled = disabled;
    });
    const saveBtn = document.querySelector("[data-billing-save]");
    if (saveBtn) saveBtn.disabled = disabled;
}

function openPicker() {
    if (billLocked) {
        setStatus("This bill is already saved. Click New bill to create another.", "info");
        return;
    }
    const modal = document.getElementById("itemPickerModal");
    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
    document.querySelector("[data-picker-search]")?.focus();
    renderPickerList();
}

function closePicker() {
    const modal = document.getElementById("itemPickerModal");
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
}

function renderPickerList() {
    const list = document.querySelector("[data-picker-list]");
    if (!list) return;

    const source = pickerTab === "projectKit" ? catalog.kits : catalog.components;
    const filtered = source.filter(item => {
        if (!pickerQuery) return true;
        const hay = `${item.name || ""} ${item.category || item.categoryName || ""} ${item.description || ""}`.toLowerCase();
        return hay.includes(pickerQuery);
    });

    if (!filtered.length) {
        list.innerHTML = `<div class="invoice-empty">No ${pickerTab === "projectKit" ? "project kits" : "components"} found.</div>`;
        return;
    }

    list.innerHTML = filtered.slice(0, 120).map(item => {
        const type = pickerTab === "projectKit" ? "projectKit" : "component";
        const price = Number(item.price) || 0;
        const image = item.image || "../assets/images/placeholders/product-placeholder.jpg";
        return `
            <button type="button" class="billing-pick-item" data-pick-id="${escapeAttr(item.id)}" data-pick-type="${type}">
                <img src="${escapeAttr(image)}" alt="">
                <div>
                    <strong>${escapeHtml(item.name || "Untitled")}</strong>
                    <span>${escapeHtml(item.categoryName || item.category || "")}</span>
                    <em>${type === "projectKit" ? "Project Kit" : "Component"}</em>
                </div>
                <div class="price">${formatPrice(price)}</div>
            </button>
        `;
    }).join("");

    list.querySelectorAll("[data-pick-id]").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.getAttribute("data-pick-id");
            const type = button.getAttribute("data-pick-type");
            const source = type === "projectKit" ? catalog.kits : catalog.components;
            const product = source.find(item => item.id === id);
            if (product) {
                addCatalogItem(product, type);
                closePicker();
            }
        });
    });
}

function addCatalogItem(product, type) {
    const existing = items.find(item => item.productId === product.id && item.type === type);
    if (existing) {
        existing.quantity += 1;
        recalculateItem(existing);
    } else {
        const sellingPrice = Number(product.price) || 0;
        const originalPrice = Number(product.originalPrice) || 0;
        const row = {
            productId: product.id,
            productName: product.name || "Item",
            type,
            sellingPrice,
            originalPrice,
            quantity: 1,
            lineTotal: 0,
            lineProfit: 0
        };
        recalculateItem(row);
        items.push(row);
    }

    renderRows();
    updateTotals();
    setStatus(`Added ${product.name}.`, "success");
}

function recalculateItem(item) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const sell = Number(item.sellingPrice) || 0;
    const cost = Number(item.originalPrice) || 0;
    item.quantity = qty;
    item.lineTotal = roundMoney(sell * qty);
    item.lineProfit = roundMoney((sell - cost) * qty);
}

function renderRows() {
    const body = document.querySelector("[data-invoice-rows]");
    if (!body) return;

    if (!items.length) {
        body.innerHTML = `<tr><td colspan="6" class="invoice-empty">No items yet. Tap + Add item to begin.</td></tr>`;
        return;
    }

    body.innerHTML = items.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <strong>${escapeHtml(item.productName)}</strong>
                <div class="no-print" style="color:#5b6b7c;font-size:11px;margin-top:2px;">${item.type === "projectKit" ? "Project Kit" : "Component"}</div>
            </td>
            <td>${formatPrice(item.sellingPrice)}</td>
            <td>
                <input type="number" min="1" step="1" value="${item.quantity}" data-qty="${index}" ${billLocked ? "disabled" : ""} aria-label="Quantity for ${escapeAttr(item.productName)}">
            </td>
            <td>${formatPrice(item.lineTotal)}</td>
            <td class="no-print">
                ${billLocked ? "" : `<button type="button" class="invoice-remove" data-remove-row="${index}" aria-label="Remove item">×</button>`}
            </td>
        </tr>
    `).join("");
}

function updateTotals() {
    const totalAmount = roundMoney(items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0));
    const totalOriginalCost = roundMoney(items.reduce((sum, item) => sum + ((Number(item.originalPrice) || 0) * (Number(item.quantity) || 0)), 0));
    const totalProfit = roundMoney(totalAmount - totalOriginalCost);

    setText("[data-invoice-total]", formatPrice(totalAmount));
    setText("[data-admin-total]", formatPrice(totalAmount));
    setText("[data-admin-cost]", formatPrice(totalOriginalCost));
    setText("[data-admin-profit]", formatPrice(totalProfit));

    const settings = getBillingSettings();
    const qrSrc = getPaymentQrSrc(settings);
    const qr = document.querySelector("[data-invoice-qr]");
    const fallback = document.querySelector("[data-invoice-qr-fallback]");

    if (qr && fallback) {
        if (qrSrc) {
            qr.src = qrSrc;
            qr.hidden = false;
            qr.removeAttribute("hidden");
            qr.onerror = () => {
                qr.hidden = true;
                qr.setAttribute("hidden", "");
                fallback.hidden = false;
                fallback.removeAttribute("hidden");
            };
            fallback.hidden = true;
            fallback.setAttribute("hidden", "");
        } else {
            qr.removeAttribute("src");
            qr.hidden = true;
            qr.setAttribute("hidden", "");
            fallback.hidden = false;
            fallback.removeAttribute("hidden");
        }
    }

    return { totalAmount, totalOriginalCost, totalProfit };
}

function handleSave() {
    try {
        if (billLocked) {
            throw new Error("This bill is already saved. Start a new bill to continue.");
        }

        const customerName = valueOf("[data-customer-name]");
        const customerPhone = valueOf("[data-customer-phone]");
        const customerAddress = valueOf("[data-customer-address]");
        const paymentMethod = valueOf("[data-payment-method]") || "Cash / UPI / Bank Transfer";

        if (!customerName) {
            throw new Error("Customer name is required.");
        }
        if (!customerPhone) {
            throw new Error("Customer phone is required.");
        }
        if (!items.length) {
            throw new Error("Add at least one item before saving.");
        }
        if (items.some(item => Number(item.quantity) < 1)) {
            throw new Error("Quantity must be at least 1 for every item.");
        }

        const { totalAmount, totalOriginalCost, totalProfit } = updateTotals();
        const bill = saveBill({
            invoiceDate: new Date().toISOString(),
            customerName,
            customerAddress,
            customerPhone,
            paymentMethod,
            items: items.map(item => ({
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

        billLocked = true;
        setText("[data-invoice-number]", bill.invoiceNumber);
        setText("[data-invoice-date]", formatDate(new Date(bill.invoiceDate || bill.createdAt)));
        setInputsDisabled(true);
        renderRows();
        showToast(`Bill saved — ${bill.invoiceNumber}`, "success");
        setStatus(`Bill saved successfully. Invoice: ${bill.invoiceNumber}. Tap Download bill to save the PDF.`, "success");
    } catch (error) {
        console.error("Save bill error:", error);
        setStatus(error.message || "Unable to save bill.", "error");
        showToast(error.message || "Unable to save bill.", "error");
    }
}

async function handleDownload() {
    if (!items.length) {
        throw new Error("Add at least one item before downloading.");
    }

    const customerName = valueOf("[data-customer-name]");
    const customerPhone = valueOf("[data-customer-phone]");
    if (!customerName) throw new Error("Customer name is required before download.");
    if (!customerPhone) throw new Error("Customer phone is required before download.");

    const { totalAmount } = updateTotals();
    const invoiceNumber = document.querySelector("[data-invoice-number]")?.textContent?.trim() || peekNextInvoiceNumber();
    const invoiceDateText = document.querySelector("[data-invoice-date]")?.textContent?.trim();

    const bill = {
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        customerName,
        customerAddress: valueOf("[data-customer-address]"),
        customerPhone,
        paymentMethod: valueOf("[data-payment-method]") || "Cash / UPI / Bank Transfer",
        items: items.map(item => ({
            productName: item.productName,
            sellingPrice: Number(item.sellingPrice) || 0,
            quantity: Number(item.quantity) || 1,
            lineTotal: Number(item.lineTotal) || 0
        })),
        totalAmount
    };

    // Prefer displayed date label when already saved
    if (invoiceDateText && invoiceDateText !== "—") {
        bill._displayDate = invoiceDateText;
    }

    const btn = document.querySelector("[data-billing-download]");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Downloading…";
    }

    setStatus("Preparing PDF…", "info");

    try {
        await downloadInvoicePdfFromBill(bill, invoiceFileName(invoiceNumber));
        setStatus(`PDF downloaded: ${invoiceFileName(invoiceNumber)}`, "success");
        showToast("Bill PDF downloaded", "success");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Download bill";
        }
    }
}

function formatDate(date) {
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function setStatus(message, type = "") {
    const el = document.querySelector("[data-billing-status]");
    if (!el) return;
    el.textContent = message || "";
    el.dataset.status = type;
    el.style.color = type === "error" ? "#b91c1c" : type === "success" ? "#0f8a4b" : "#5b6b7c";
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

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
