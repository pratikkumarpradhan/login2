/* =========================================================
   PROJECTKART
   Billing settings (local) + QR helpers
   Bill CRUD lives in bills-db.js (Firestore)
   ========================================================= */

export {
    buildMonthlyAnalytics,
    deleteBill,
    formatInvoiceNumber,
    getAllBills,
    getBillById,
    getCurrentMonthStats,
    getInvoiceCounter,
    migrateLocalBillsIfNeeded,
    peekNextInvoiceNumber,
    saveBill,
    updateBill,
    watchBills
} from "./bills-db.js";

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
        console.error("Billing settings read error:", error);
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
    return "";
}

export function qrImageUrl() {
    return "";
}
