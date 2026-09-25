/* =========================================================
   PROJECTKART
   Customer-facing invoice HTML (no profit / original price)
   ========================================================= */

import { formatPrice } from "../utils.js";
import {
    getBillingSettings,
    getPaymentQrSrc
} from "./billing-storage.js";

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
}

function formatInvoiceDate(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

/**
 * Compact professional invoice markup for PDF / customer view.
 * Uses inline layout styles so viewport media queries cannot stack columns.
 */
export function buildCustomerInvoiceHTML(bill, settings = getBillingSettings()) {
    const dateLabel = formatInvoiceDate(bill.invoiceDate || bill.createdAt);
    const qrSrc = getPaymentQrSrc(settings);
    const qrBlock = qrSrc
        ? `<img src="${escapeAttr(qrSrc)}" alt="Scan &amp; Pay QR" style="width:120px;height:120px;object-fit:contain;border:1px solid #d7dee8;border-radius:6px;padding:4px;background:#fff;display:block;">`
        : `<div style="color:#5b6b7c;font-size:12px;">Add your QR PNG in Bill settings</div>`;

    const rows = (bill.items || []).map((item, index) => `
        <tr>
            <td style="padding:8px 6px;border:1px solid #d7dee8;text-align:center;width:46px;">${index + 1}</td>
            <td style="padding:8px 8px;border:1px solid #d7dee8;">${escapeHtml(item.productName)}</td>
            <td style="padding:8px 8px;border:1px solid #d7dee8;text-align:right;width:100px;">${formatPrice(item.sellingPrice)}</td>
            <td style="padding:8px 6px;border:1px solid #d7dee8;text-align:center;width:70px;">${Number(item.quantity) || 1}</td>
            <td style="padding:8px 8px;border:1px solid #d7dee8;text-align:right;width:110px;font-weight:700;">${formatPrice(item.lineTotal)}</td>
        </tr>
    `).join("");

    const customerLines = [
        bill.customerName ? `<div style="font-size:14px;font-weight:800;color:#0b1f3a;margin:0 0 4px;">${escapeHtml(bill.customerName)}</div>` : "",
        bill.customerAddress ? `<div style="font-size:12.5px;color:#5b6b7c;line-height:1.45;margin:0 0 3px;">${escapeHtml(bill.customerAddress)}</div>` : "",
        bill.customerPhone ? `<div style="font-size:12.5px;color:#5b6b7c;margin:0;">Phone: ${escapeHtml(bill.customerPhone)}</div>` : ""
    ].join("");

    return `
<section class="invoice-sheet invoice-sheet--pdf" style="
    width:794px;
    max-width:794px;
    margin:0;
    padding:22px 26px 18px;
    border:2px solid #0b1f3a;
    background:#ffffff;
    color:#122033;
    box-sizing:border-box;
    font-family:Arial, Helvetica, sans-serif;
">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:18px;padding-bottom:12px;border-bottom:3px solid #d4a017;box-sizing:border-box;">
        <img src="../assets/images/logo1.png" alt="ProjectKart" style="width:96px;height:auto;object-fit:contain;flex:0 0 auto;display:block;">
        <div style="flex:1 1 auto;min-width:0;">
            <div style="margin:0 0 6px;color:#0b1f3a;font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;">
                ${escapeHtml(settings.businessName || "ProjectKart")}
            </div>
            <div style="margin:0 0 8px;color:#d4a017;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;line-height:1.35;">
                ${escapeHtml(settings.tagline || "Electronics • Components • Project Kits")}
            </div>
            <div style="margin:0;color:#5b6b7c;font-size:12px;line-height:1.45;">
                <div><strong style="color:#0b1f3a;">Address:</strong> ${escapeHtml(settings.address || "")}</div>
                <div><strong style="color:#0b1f3a;">Phone / WhatsApp:</strong> ${escapeHtml(settings.phone || "")}</div>
                <div>Online &amp; Offline Store</div>
            </div>
        </div>
    </div>

    <!-- Bill To | Invoice (forced side-by-side) -->
    <div style="display:flex;align-items:flex-start;gap:20px;margin-top:14px;padding-bottom:12px;border-bottom:1px solid #d7dee8;box-sizing:border-box;">
        <div style="flex:1 1 55%;min-width:0;">
            <div style="margin:0 0 8px;color:#0b1f3a;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">Bill To</div>
            ${customerLines || `<div style="color:#5b6b7c;font-size:12.5px;">—</div>`}
        </div>
        <div style="flex:0 0 38%;min-width:220px;border-left:1px solid #d7dee8;padding-left:18px;box-sizing:border-box;">
            <div style="margin:0 0 8px;color:#0b1f3a;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">Invoice</div>
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
                <tr>
                    <td style="padding:3px 0;color:#5b6b7c;width:42%;vertical-align:top;">Invoice No.</td>
                    <td style="padding:3px 0;color:#0b1f3a;font-weight:800;text-align:right;">${escapeHtml(bill.invoiceNumber || "—")}</td>
                </tr>
                <tr>
                    <td style="padding:3px 0;color:#5b6b7c;vertical-align:top;">Date</td>
                    <td style="padding:3px 0;color:#0b1f3a;font-weight:700;text-align:right;">${escapeHtml(dateLabel)}</td>
                </tr>
                <tr>
                    <td style="padding:3px 0;color:#5b6b7c;vertical-align:top;">Payment</td>
                    <td style="padding:3px 0;color:#0b1f3a;font-weight:700;text-align:right;">${escapeHtml(bill.paymentMethod || "Cash / UPI / Bank Transfer")}</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Items -->
    <div style="margin-top:14px;">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12.5px;">
            <thead>
                <tr>
                    <th style="padding:9px 6px;border:1px solid #0b1f3a;background:#0b1f3a;color:#fff;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;width:46px;">SL.</th>
                    <th style="padding:9px 8px;border:1px solid #0b1f3a;background:#0b1f3a;color:#fff;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;text-align:left;">Item description</th>
                    <th style="padding:9px 8px;border:1px solid #0b1f3a;background:#0b1f3a;color:#fff;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;width:100px;text-align:right;">Price (₹)</th>
                    <th style="padding:9px 6px;border:1px solid #0b1f3a;background:#0b1f3a;color:#fff;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;width:70px;text-align:center;">Qty.</th>
                    <th style="padding:9px 8px;border:1px solid #0b1f3a;background:#0b1f3a;color:#fff;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;width:110px;text-align:right;">Total (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${rows || `<tr><td colspan="5" style="padding:18px;border:1px solid #d7dee8;text-align:center;color:#5b6b7c;">No items</td></tr>`}
            </tbody>
        </table>
    </div>

    <!-- QR + TOTAL -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-top:14px;box-sizing:border-box;">
        <div style="flex:1 1 auto;">
            <div style="margin:0 0 6px;color:#0b1f3a;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Scan &amp; Pay</div>
            ${qrBlock}
            <div style="margin-top:6px;color:#5b6b7c;font-size:11px;">UPI / PhonePe / Google Pay</div>
        </div>
        <div style="flex:0 0 240px;border:2px solid #0b1f3a;border-radius:8px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#0b1f3a;color:#fff;font-size:15px;font-weight:800;">
                <span>TOTAL</span>
                <span style="color:#f3d27a;">${formatPrice(bill.totalAmount)}</span>
            </div>
        </div>
    </div>

    <!-- Terms + Sign -->
    <div style="display:flex;align-items:flex-start;gap:20px;margin-top:16px;padding-top:12px;border-top:1px solid #d7dee8;box-sizing:border-box;">
        <div style="flex:1 1 65%;min-width:0;">
            <div style="margin:0 0 6px;color:#0b1f3a;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Terms &amp; Conditions</div>
            <ol style="margin:0;padding-left:16px;color:#5b6b7c;font-size:11.5px;line-height:1.5;">
                <li>Goods once sold will not be returned or exchanged.</li>
                <li>Warranty is applicable only for manufacturing defects.</li>
                <li>Payment should be made at the time of delivery / before shipment.</li>
                <li>For any queries, contact ProjectKart.</li>
            </ol>
        </div>
        <div style="flex:0 0 180px;text-align:center;">
            <div style="margin:0 0 36px;color:#0b1f3a;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Authorised Sign</div>
            <div style="border-top:1px solid #0b1f3a;padding-top:6px;color:#0b1f3a;font-size:11px;font-weight:700;">Authorised Signatory</div>
        </div>
    </div>

    <div style="margin-top:12px;padding-top:8px;border-top:2px solid #d4a017;color:#5b6b7c;font-size:10.5px;text-align:center;">
        Thank you for shopping with ProjectKart — Electronics • Components • Project Kits
    </div>
</section>`;
}
