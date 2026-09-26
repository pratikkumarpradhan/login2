/* =========================================================
   PROJECTKART
   Local billing storage — invoices, counter, settings
   ========================================================= */

const BILLS_KEY = "projectkart_bills_v1";
const COUNTER_KEY = "projectkart_invoice_counter_v1";
const SETTINGS_KEY = "projectkart_billing_settings_v1";

export const DEFAULT_BILLING_SETTINGS = {
    businessName: "ProjectKart",
    tagline: "Electronics • Components • Project Kits",
    address: "Near Bidyut Bakery & Chai Bari, Kshudiramnagar",
    phone: "9434693252, 9432908449",
    /** Static PNG QR path (relative to admin pages). Used when no uploaded image is saved. */
    qrImagePath: "../assets/images/upi-qr.png",
    /** Optional data-URL from admin upload — preferred when set. */
    qrImageData: "",
    paymentNote: "Cash / UPI / Bank Transfer"
};

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (error) {
        console.error("Billing storage read error:", error);
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getBillingSettings() {
    return {
        ...DEFAULT_BILLING_SETTINGS,
        ...readJSON(SETTINGS_KEY, {})
    };
}

export function saveBillingSettings(partial = {}) {
    const next = {
        ...getBillingSettings(),
        ...partial
    };
    writeJSON(SETTINGS_KEY, next);
    return next;
}

export function getInvoiceCounter() {
    const value = Number(localStorage.getItem(COUNTER_KEY) || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function peekNextInvoiceNumber() {
    return formatInvoiceNumber(getInvoiceCounter() + 1);
}

export function formatInvoiceNumber(n) {
    const num = Math.max(1, Math.floor(Number(n) || 1));
    return `PK-${String(num).padStart(5, "0")}`;
}

export function getAllBills() {
    const bills = readJSON(BILLS_KEY, []);
    return Array.isArray(bills) ? bills : [];
}

export function getBillById(id) {
    return getAllBills().find(bill => bill.id === id) || null;
}

export function getBillByInvoiceNumber(invoiceNumber) {
    return getAllBills().find(bill => bill.invoiceNumber === invoiceNumber) || null;
}

export function saveBill(billInput) {
    const bills = getAllBills();
    const counter = getInvoiceCounter() + 1;
    const invoiceNumber = formatInvoiceNumber(counter);

    if (bills.some(bill => bill.invoiceNumber === invoiceNumber)) {
        throw new Error("Invoice number collision. Please try again.");
    }

    const bill = {
        ...billInput,
        id: `bill_${Date.now()}_${counter}`,
        invoiceNumber,
        createdAt: new Date().toISOString()
    };

    bills.unshift(bill);
    writeJSON(BILLS_KEY, bills);
    localStorage.setItem(COUNTER_KEY, String(counter));

    return bill;
}

export function buildMonthlyAnalytics(bills = getAllBills()) {
    const byMonth = new Map();

    bills.forEach(bill => {
        const date = new Date(bill.invoiceDate || bill.createdAt);
        if (Number.isNaN(date.getTime())) return;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleString("en-IN", { month: "short", year: "numeric" });
        const existing = byMonth.get(key) || {
            key,
            label,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            sales: 0,
            profit: 0,
            bills: 0,
            itemsSold: 0
        };

        existing.sales += Number(bill.totalAmount) || 0;
        existing.profit += Number(bill.totalProfit) || 0;
        existing.bills += 1;
        existing.itemsSold += (bill.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        byMonth.set(key, existing);
    });

    return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function getCurrentMonthStats(bills = getAllBills()) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthly = buildMonthlyAnalytics(bills).find(item => item.key === key);

    return monthly || {
        key,
        label: now.toLocaleString("en-IN", { month: "long", year: "numeric" }),
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        sales: 0,
        profit: 0,
        bills: 0,
        itemsSold: 0
    };
}

export function getPaymentQrSrc(settings = getBillingSettings()) {
    const data = String(settings.qrImageData || "").trim();
    if (data.startsWith("data:image")) return data;

    const path = String(settings.qrImagePath || DEFAULT_BILLING_SETTINGS.qrImagePath).trim();
    return path || "";
}

/**
 * Resolve the payment QR to a data URL so PDF/html2canvas can always render it.
 */
export async function resolvePaymentQrDataUrl(settings = getBillingSettings()) {
    const src = getPaymentQrSrc(settings);
    if (!src) return "";
    if (src.startsWith("data:image")) return src;

    // Prefer the already-loaded on-screen QR if present
    const live = document.querySelector("[data-invoice-qr], [data-settings-qr-preview]");
    if (live instanceof HTMLImageElement && live.complete && live.naturalWidth > 0) {
        const liveSrc = live.currentSrc || live.src || "";
        if (liveSrc.startsWith("data:image")) return liveSrc;
        try {
            return await imageElementToDataUrl(live);
        } catch (error) {
            console.warn("Could not read live QR image:", error);
        }
    }

    try {
        return await urlToDataUrl(src);
    } catch (error) {
        console.warn("Could not resolve QR image URL:", src, error);
        return src;
    }
}

function imageElementToDataUrl(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 300;
    canvas.height = img.naturalHeight || img.height || 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
}

async function urlToDataUrl(src) {
    const absoluteUrl = new URL(src, document.baseURI).href;

    try {
        const response = await fetch(absoluteUrl, { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        return await blobToDataUrl(blob);
    } catch (fetchError) {
        // Fallback: load via Image then paint to canvas
        const img = await loadImage(absoluteUrl);
        return imageElementToDataUrl(img);
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Image load failed: ${src}`));
        img.src = src;
    });
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function buildUpiQrPayload() {
    // Kept for compatibility — QR is now a static PNG image, not generated.
    return "";
}

export function qrImageUrl() {
    return "";
}
