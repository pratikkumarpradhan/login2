/* =========================================================
   PROJECTKART
   WhatsApp click-to-chat ordering (no Business API)
   ========================================================= */

export const WHATSAPP_NUMBER = "919434693252";

function formatRupee(amount) {
    const value = Math.round(Number(amount) || 0);
    return `₹${value.toLocaleString("en-IN")}`;
}

export function buildSingleProductWhatsAppMessage({
    name,
    quantity,
    unitPrice
}) {
    const qty = Math.max(1, Number(quantity) || 1);
    const unit = Number(unitPrice);
    const total = unit * qty;

    if (!String(name || "").trim()) {
        throw new Error("Product name is missing.");
    }

    if (!Number.isFinite(unit) || unit < 0) {
        throw new Error("Product price is invalid.");
    }

    if (!Number.isFinite(qty) || qty < 1) {
        throw new Error("Quantity must be at least 1.");
    }

    return [
        "Hi ProjectKart, I'd like to order:",
        "",
        String(name).trim(),
        `Qty: ${qty}`,
        `Price: ${formatRupee(total)}`
    ].join("\n");
}

export function buildSelectedCartWhatsAppMessage(items) {
    if (!Array.isArray(items) || !items.length) {
        throw new Error("Please select at least one item to order.");
    }

    const lines = ["Hi ProjectKart, I'd like to order:", ""];
    let cartTotal = 0;

    items.forEach((item, index) => {
        const name = String(item?.name || "").trim();
        const qty = Math.max(1, Number(item?.quantity) || 1);
        const unit = Number(item?.price);
        const itemTotal = unit * qty;

        if (!name) {
            throw new Error("One of the selected products is missing a name.");
        }

        if (!Number.isFinite(unit) || unit < 0) {
            throw new Error(`Invalid price for ${name || "a selected item"}.`);
        }

        cartTotal += itemTotal;

        lines.push(`${index + 1}. ${name}`);
        lines.push(`Qty: ${qty}`);
        lines.push(`Price: ${formatRupee(itemTotal)}`);
        lines.push("");
    });

    lines.push(`Total: ${formatRupee(cartTotal)}`);
    return lines.join("\n");
}

export function openWhatsAppOrder(message) {
    if (!WHATSAPP_NUMBER) {
        throw new Error("WhatsApp number is not configured.");
    }

    const text = String(message || "").trim();
    if (!text) {
        throw new Error("Order message is empty.");
    }

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return url;
}
