/* =========================================================
   PROJECTKART
   Customer invoice HTML — matches ProjectKart bill reference UI
   Used for PDF download + bill history viewer
   ========================================================= */

import { formatPrice } from "../utils.js";
import {
    getBillingSettings,
    getPaymentQrSrc
} from "./billing-storage.js";

/** A4 at ~96dpi when width is 794px */
export const INVOICE_PAGE_WIDTH = 794;
export const INVOICE_PAGE_HEIGHT = 1123;

const NAVY = "#0b1f3a";
const YELLOW = "#f5c518";
const MUTED = "#5b6b7c";
const LINE = "#d7dee8";
const CARD_BG = "#f5f8fb";

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

/** Canvas-safe yellow pill (height === line-height). */
function yellowPill(text, opts = {}) {
    const {
        fontSize = 12,
        height = 28,
        radius = 14,
        minWidth = 0,
        paddingX = 12
    } = opts;

    return `<span style="
        display:inline-block;
        box-sizing:border-box;
        background:${YELLOW};
        color:${NAVY};
        font-size:${fontSize}px;
        font-weight:700;
        font-family:Arial, Helvetica, sans-serif;
        line-height:${height}px;
        height:${height}px;
        padding:0 ${paddingX}px;
        border-radius:${radius}px;
        text-align:center;
        white-space:nowrap;
        vertical-align:middle;
        ${minWidth ? `min-width:${minWidth}px;` : ""}
    ">${escapeHtml(text)}</span>`;
}

function iconCircle(bg, svgInner) {
    return `<span style="
        display:inline-block;
        width:22px;
        height:22px;
        border-radius:50%;
        background:${bg};
        text-align:center;
        line-height:22px;
        vertical-align:middle;
        margin-right:8px;
    "><svg width="12" height="12" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;" fill="#fff" xmlns="http://www.w3.org/2000/svg">${svgInner}</svg></span>`;
}

const ICONS = {
    pin: iconCircle(NAVY, `<path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>`),
    phone: iconCircle(NAVY, `<path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"/>`),
    store: iconCircle(NAVY, `<path d="M4 6l1.5-3h13L20 6v2H4V6zm0 3h16v11H4V9zm3 2v7h2v-7H7zm4 0v7h2v-7h-2zm4 0v7h2v-7h-2z"/>`),
    user: iconCircle(YELLOW, `<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z" fill="${NAVY}"/>`),
    doc: iconCircle(NAVY, `<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm1 7V3.5L18.5 9H15z"/>`),
    terms: iconCircle(YELLOW, `<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="${NAVY}"/>`)
};

/**
 * Exact reference-style customer invoice for PDF download.
 */
export function buildCustomerInvoiceHTML(bill, settings = getBillingSettings(), options = {}) {
    const dateLabel = formatInvoiceDate(bill.invoiceDate || bill.createdAt);
    const qrSrc = String(options.qrDataUrl || getPaymentQrSrc(settings) || "").trim();

    const qrBlock = qrSrc
        ? `<img
            src="${escapeAttr(qrSrc)}"
            alt="Scan &amp; Pay QR"
            width="100"
            height="100"
            crossorigin="anonymous"
            style="
                display:block;
                width:100px;
                height:100px;
                object-fit:contain;
                background:#ffffff;
                border:0;
            "
        >`
        : `<div style="width:100px;height:100px;box-sizing:border-box;padding:10px;color:${MUTED};font-size:11px;text-align:center;line-height:1.3;font-family:Arial,Helvetica,sans-serif;">Add QR PNG</div>`;
    const headCell = `
        padding:0 8px;
        height:40px;
        border:0;
        background:${NAVY};
        color:#ffffff;
        font-size:11px;
        font-weight:700;
        font-family:Arial, Helvetica, sans-serif;
        letter-spacing:0.05em;
        text-transform:uppercase;
        text-align:center;
        vertical-align:middle;
        line-height:14px;
    `;

    const bodyCell = `
    box-sizing:border-box;
    padding:10px 8px;
    border-bottom:1px solid #d9d9d9;
    border-left:0;
    border-right:1px solid #d9d9d9;
    border-top:0;
    color:#111111;
    background:#ffffff;
    font-size:13px;
    font-family:Arial, Helvetica, sans-serif;
    line-height:1.35;
    letter-spacing:0;
    vertical-align:middle;
    text-align:center;
    white-space:normal;
    word-break:break-word;
    overflow-wrap:anywhere;
`;

    const rows = (bill.items || []).map((item, index) => {
        return `
        <tr>
            <td style="
                ${bodyCell}
                width:54px;
                font-weight:700;
                text-align:center;
            ">
                ${index + 1}
            </td>

            <td style="
                ${bodyCell}
                text-align:center;
                padding-left:10px;
                padding-right:10px;
            ">
                ${escapeHtml(item.productName)}
            </td>

            <td style="
                ${bodyCell}
                width:110px;
                text-align:center;
            ">
                ${formatPrice(item.sellingPrice)}
            </td>

            <td style="
                ${bodyCell}
                width:70px;
                text-align:center;
            ">
                ${Number(item.quantity) || 1}
            </td>

            <td style="
                ${bodyCell}
                width:120px;
                text-align:center;
                font-weight:700;
                border-right:0;
            ">
                ${formatPrice(item.lineTotal)}
            </td>
        </tr>
    `;
    }).join("");

    const customerBlock = [
        bill.customerName
            ? `<div style="
            margin:0 0 4px;
            font-size:14px;
            font-weight:700;
            color:${NAVY};
            line-height:1.3;
            font-family:Arial,Helvetica,sans-serif;
            text-transform:uppercase;
        ">${escapeHtml(bill.customerName)}</div>`
            : "",
        bill.customerAddress
            ? `<div style="margin:0 0 4px;font-size:12.5px;color:${MUTED};line-height:1.4;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(bill.customerAddress)}</div>`
            : "",
        bill.customerPhone
            ? `<div style="margin:0;font-size:12.5px;color:${MUTED};line-height:1.35;font-family:Arial,Helvetica,sans-serif;">Phone: ${escapeHtml(bill.customerPhone)}</div>`
            : ""
    ].join("") || `<div style="color:${MUTED};font-size:12.5px;">—</div>`;

    const invoicePill = yellowPill(`# ${bill.invoiceNumber || "—"}`, {
        fontSize: 12,
        height: 28,
        radius: 14,
        paddingX: 12
    });

    const totalPrice = formatPrice(bill.totalAmount);

    return `
<section class="invoice-sheet invoice-sheet--pdf" style="
    width:${INVOICE_PAGE_WIDTH}px;
    min-height:${INVOICE_PAGE_HEIGHT}px;
    max-width:${INVOICE_PAGE_WIDTH}px;
    margin:0;
    padding:28px 28px 0;
    border:1px solid ${LINE};
    border-radius:14px;
    background:#ffffff;
    color:${NAVY};
    box-sizing:border-box;
    font-family:Arial, Helvetica, sans-serif;
    display:flex;
    flex-direction:column;
    box-shadow:0 8px 28px rgba(11,31,58,0.08);
">
    <div style="flex:0 0 auto;">
<!-- ProjectKart Header -->
<div style="
    width:100%;
    box-sizing:border-box;
    padding:10px 0 14px;
    background:#ffffff;
">

    <div style="
        display:table;
        width:100%;
        table-layout:fixed;
        border-collapse:collapse;
    ">

        <div style="display:table-row;">

            <!-- LOGO -->
            <div style="
                display:table-cell;
                width:190px;
                vertical-align:middle;
                padding:0 18px 0 0;
                border-right:2px solid #111111;
                box-sizing:border-box;
            ">

                <img
                    src="../assets/images/logo1.png"
                    alt="ProjectKart"
                    style="
                        display:block;
                        width:175px;
                        height:auto;
                        object-fit:contain;
                    "
                >

            </div>


            <!-- BUSINESS INFORMATION -->
            <div style="
                display:table-cell;
                vertical-align:middle;
                padding-left:22px;
                padding-top:0;
            ">

                <!-- Business Name -->
                <div style="
                    margin:0 0 12px;
                    color:${NAVY};
                    font-family:Arial, Helvetica, sans-serif;
                    font-size:36px;
                    font-weight:800;
                    line-height:1;
                    letter-spacing:-0.025em;
                ">
                    ${escapeHtml(settings.businessName || "ProjectKart")}
                </div>


                <!-- Tagline -->
                <div style="
                    margin:0 0 18px;
                    color:#d99a00;
                    font-family:Arial, Helvetica, sans-serif;
                    font-size:14px;
                    font-weight:700;
                    line-height:1.2;
                    letter-spacing:0.08em;
                    text-transform:uppercase;
                ">
                    ${escapeHtml(
        settings.tagline ||
        "Electronics • Components • Project Kits"
    )}
                </div>


                <!-- Address -->
                <div style="
                    margin:0 0 8px;
                    color:${MUTED};
                    font-family:Arial, Helvetica, sans-serif;
                    font-size:15px;
                    line-height:1.3;
                    font-weight:400;
                ">
                    <strong style="
                        color:${MUTED};
                        font-weight:700;
                    ">Address:</strong>
                    ${escapeHtml(
        settings.address ||
        "Near Bidyut Bakery & Chai Bari, Kshudiramnagar"
    )}
                </div>


                <!-- Phone / WhatsApp -->
                <div style="
                    margin:0 0 8px;
                    color:${MUTED};
                    font-family:Arial, Helvetica, sans-serif;
                    font-size:15px;
                    line-height:1.3;
                    font-weight:400;
                ">
                    <strong style="
                        color:${MUTED};
                        font-weight:700;
                    ">Phone / WhatsApp:</strong>
                    ${escapeHtml(
        settings.phone ||
        "9434693252, 9432908449"
    )}
                </div>


               

            </div>

        </div>

    </div>


    <!-- HORIZONTAL DIVIDER BELOW HEADER -->
    <div style="
        width:100%;
        height:2px;
        background:#111111;
        margin-top:16px;
    "></div>

</div>

<!-- Bill To | Invoice -->
<div style="
    display:table;
    width:100%;
    table-layout:fixed;
    border-collapse:separate;
    border-spacing:12px 0;
    margin-top:16px;
">
    <div style="display:table-row;">

        <!-- BILL TO -->
        <div style="
            display:table-cell;
            width:50%;
            vertical-align:top;
            background:#ffffff;
            border:1px solid #d9d9d9;
            border-radius:10px;
            padding:14px 16px;
            box-sizing:border-box;
        ">
            <div style="
                margin:0 0 10px;
                padding-bottom:8px;
                border-bottom:1px solid #dddddd;
                color:#111111;
                font-size:15px;
                font-weight:700;
                line-height:1.2;
            ">
                Bill To
            </div>

            ${customerBlock}
        </div>


        <!-- INVOICE -->
        <div style="
            display:table-cell;
            width:50%;
            vertical-align:top;
            background:#ffffff;
            border:1px solid #d9d9d9;
            border-radius:10px;
            padding:14px 16px;
            box-sizing:border-box;
        ">
            <div style="
                margin:0 0 10px;
                padding-bottom:8px;
                border-bottom:1px solid #dddddd;
                color:#111111;
                font-size:15px;
                font-weight:700;
                line-height:1.2;
            ">
                Invoice
            </div>

            <table style="
                width:100%;
                border-collapse:collapse;
                font-size:12.5px;
                font-family:Arial,Helvetica,sans-serif;
            ">
                <tr>
                    <td style="
                        padding:4px 0;
                        color:#555555;
                        width:42%;
                        line-height:1.35;
                        vertical-align:middle;
                    ">
                        Invoice No.
                    </td>

                    <td style="
                        padding:4px 0;
                        color:#111111;
                        font-weight:600;
                        line-height:1.35;
                        vertical-align:middle;
                    ">
                        ${escapeHtml(bill.invoiceNumber || "—")}
                    </td>
                </tr>

                <tr>
                    <td style="
                        padding:4px 0;
                        color:#555555;
                        line-height:1.35;
                        vertical-align:middle;
                    ">
                        Invoice Date
                    </td>

                    <td style="
                        padding:4px 0;
                        color:#111111;
                        font-weight:600;
                        line-height:1.35;
                        vertical-align:middle;
                    ">
                        ${escapeHtml(dateLabel)}
                    </td>
                </tr>

                <tr>
                    <td style="
                        padding:4px 0;
                        color:#555555;
                        line-height:1.35;
                        vertical-align:middle;
                    ">
                        Payment Method
                    </td>

                    <td style="
                        padding:4px 0;
                        color:#111111;
                        font-weight:600;
                        line-height:1.35;
                        vertical-align:middle;
                    ">
                        ${escapeHtml(
        bill.paymentMethod ||
        "Cash / UPI / Bank Transfer"
    )}
                    </td>
                </tr>
            </table>
        </div>

    </div>
</div>

</div>

<!-- Items table -->
<div style="
    margin-top:16px;
    border:1px solid #d9d9d9;
    border-radius:10px;
    overflow:hidden;
    background:#ffffff;
">
  <table style="
    width:100%;
    border-collapse:collapse;
    border-spacing:0;
    table-layout:fixed;
    font-family:Arial,Helvetica,sans-serif;
    background:#ffffff;
    box-sizing:border-box;
    word-break:break-word;
    overflow-wrap:anywhere;
">
        <thead>
            <tr>
                <th style="
                    width:54px;
                    padding:9px 8px;
                    background:#ffffff;
                    color:#111111;
                    border-right:1px solid #d9d9d9;
                    border-bottom:1px solid #222222;
                    font-size:11.5px;
                    font-weight:700;
                    text-align:center;
letter-spacing:0;
white-space:normal;
word-break:break-word;
                    vertical-align:middle;
                ">
                    SL.
                </th>

                <th style="
                    padding:9px 10px;
                    background:#ffffff;
                    color:#111111;
                    border-right:1px solid #d9d9d9;
                    border-bottom:1px solid #222222;
                    font-size:11.5px;
                    font-weight:700;
                    text-align:center;
                    vertical-align:middle;
                ">
                    ITEM DESCRIPTION
                </th>

                <th style="
                    width:110px;
                    padding:9px 8px;
                    background:#ffffff;
                    color:#111111;
                    border-right:1px solid #d9d9d9;
                    border-bottom:1px solid #222222;
                    font-size:11.5px;
                    font-weight:700;
                    text-align:center;
                    vertical-align:middle;
                ">
                    PRICE (₹)
                </th>

                <th style="
                    width:70px;
                    padding:9px 8px;
                    background:#ffffff;
                    color:#111111;
                    border-right:1px solid #d9d9d9;
                    border-bottom:1px solid #222222;
                    font-size:11.5px;
                    font-weight:700;
                    text-align:center;
                    vertical-align:middle;
                ">
                    QTY.
                </th>

                <th style="
                    width:120px;
                    padding:9px 8px;
                    background:#ffffff;
                    color:#111111;
                    border-bottom:1px solid #222222;
                    border-right:0;
                    font-size:11.5px;
                    font-weight:700;
                    text-align:center;
                    vertical-align:middle;
                ">
                    TOTAL (₹)
                </th>
            </tr>
        </thead>

        <tbody>
            ${rows ||
        `
                <tr>
                    <td colspan="5" style="
                        padding:12px 10px;
                        background:#ffffff;
                        color:#555555;
                        text-align:center;
                        font-size:12px;
                        border-top:0;
                        border-bottom:0;
                        vertical-align:middle;
                    ">
                        No items
                    </td>
                </tr>
            `
        }
        </tbody>
    </table>
</div>

       <!-- Terms | Total + QR -->
<div style="display:table;width:100%;table-layout:fixed;border-collapse:collapse;margin-top:18px;">
    <div style="display:table-row;">

        <!-- Terms & Conditions -->
        <div style="display:table-cell;width:50%;vertical-align:top;padding-right:16px;border-right:2px solid ${YELLOW};">
            <div style="margin:0 0 10px;line-height:22px;">
                <span style="display:inline-block;vertical-align:middle;color:#111111;font-size:14px;font-weight:800;">
                    Terms &amp; Conditions
                </span>
            </div>

          <ol style="
    list-style:none;
    margin:0;
    padding:0;
    color:#111111;
    font-size:11.5px;
    line-height:1.6;
    font-family:Arial,Helvetica,sans-serif;
    counter-reset:terms;
">
    <li style="
        margin:0 0 5px;
        counter-increment:terms;
        padding-left:22px;
        position:relative;
    ">
        <span style="
            position:absolute;
            left:0;
            top:0;
            font-weight:700;
        ">1)</span>
        Goods once sold will not be returned or exchanged.
    </li>

    <li style="
        margin:0 0 5px;
        counter-increment:terms;
        padding-left:22px;
        position:relative;
    ">
        <span style="
            position:absolute;
            left:0;
            top:0;
            font-weight:700;
        ">2)</span>
        Warranty is applicable only for manufacturing defects.
    </li>

    <li style="
        margin:0 0 5px;
        counter-increment:terms;
        padding-left:22px;
        position:relative;
    ">
        <span style="
            position:absolute;
            left:0;
            top:0;
            font-weight:700;
        ">3)</span>
        Payment should be made at the time of delivery / before shipment.
    </li>

    <li style="
        margin:0;
        padding-left:22px;
        position:relative;
    ">
        <span style="
            position:absolute;
            left:0;
            top:0;
            font-weight:700;
        ">4)</span>
        For any queries, contact us at the details above.
    </li>
</ol>
        </div>

        <!-- Total + QR -->
        <div style="display:table-cell;width:50%;vertical-align:top;padding-left:16px;">

    

           <!-- Total -->
<div style="
    margin:0 0 12px;
    text-align:center;
">
    <table style="
        width:auto;
        margin:0 auto;
        border-collapse:collapse;
    ">
        <tr>

            <!-- Total label -->
            <td style="
                padding:0 14px 0 0;
                color:#111111;
                font-size:18px;
                font-weight:800;
                line-height:1.3;
                font-family:Arial,Helvetica,sans-serif;
                text-align:center;
                vertical-align:middle;
                white-space:nowrap;
            ">
                Total : 
            </td>

            <!-- Price box -->
            <td style="
                min-width:125px;
                height:40px;
    padding:0 18px 16px;
                background:#ffffff;
                border:2px solid ${YELLOW};
                border-radius:8px;
                color:#111111;
                font-size:22px;
                font-weight:800;
                line-height:1.2;
                font-family:Arial,Helvetica,sans-serif;
                text-align:center;
                vertical-align:middle;
                white-space:nowrap;
                box-sizing:border-box;
            ">
                ${totalPrice}
            </td>

        </tr>
    </table>
</div>

            <div style="display:table;width:100%;border-collapse:collapse;">
                <div style="display:table-row;">
                    <div style="display:table-cell;vertical-align:middle;width:112px;">
                       <div style="
    position:relative;
    display:inline-block;
    padding:3px;
    border:3px solid ${YELLOW};
    border-radius:10px;
    background:#ffffff;
    box-sizing:border-box;
    line-height:0;
    z-index:1;
    overflow:visible;
">
    <div style="
        position:relative;
        z-index:2;
        background:#ffffff;
        line-height:0;
    ">
        ${qrBlock}
    </div>
</div>
                    </div>

                    <div style="display:table-cell;vertical-align:middle;padding-left:12px;">
                        <div style="margin:0 0 3px;color:${NAVY};font-size:15px;font-weight:800;line-height:1.2;font-family:Arial,Helvetica,sans-serif;">
                            Scan &amp; Pay
                        </div>
                        <div style="margin:0 0 8px;color:${MUTED};font-size:11.5px;line-height:1.3;font-family:Arial,Helvetica,sans-serif;">
                            UPI / PhonePe / GPay
                        </div>
                       <div>
  <div style="
    display:flex;
    align-items:center;
    gap:6px;
    margin-top:2px;
">
    <!-- UPI -->
    <img
        src="../assets/images/upi.png"
        alt="UPI"
        style="
            display:block;
            width:38px;
            height:30px;
            object-fit:contain;
        "
    />

    <!-- PhonePe -->
    <img
        src="../assets/images/phone.png"
        alt="PhonePe"
        style="
            display:block;
            width:38px;
            height:30px;
            object-fit:contain;
        "
    />

    <!-- GPay -->
    <img
        src="../assets/images/gpay.png"
        alt="Google Pay"
        style="
            display:block;
            width:38px;
            height:30px;
            object-fit:contain;
        "
    />

</div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>
    </div>

    <!-- Flexible blank space to fill A4 -->
    <div style="flex:1 1 auto;min-height:36px;"></div>

    <!-- Footer block -->
    <div style="flex:0 0 auto;">

    <div style="
        display:table;
        width:100%;
        table-layout:fixed;
        border-collapse:collapse;
        margin-bottom:12px;
    ">
        <div style="display:table-row;">

            <!-- Thank-you text -->
            <div style="display:table-cell;vertical-align:bottom;">

                <div style="
                    color:#111111;
                    font-size:16px;
                    font-family:Georgia,'Times New Roman',serif;
                    font-style:italic;
                    font-weight:700;
                    line-height:1.2;
                ">
                    Thank you for choosing ProjectKart!
                </div>

                <div style="
                    margin-top:4px;
                    width:150px;
                    height:3px;
                   
                    border-radius:2px;
                "></div>

            </div>

            <!-- Authorised Sign -->
          <!--  <div style="
                display:table-cell;
                vertical-align:bottom;
                text-align:right;
            ">
                <div style="
                    display:inline-block;
                    min-width:170px;
                    text-align:center;
                ">
                    <div style="
                        border-top:1.5px solid #111111;
                        padding-top:6px;
                        color:#111111;
                        font-size:11px;
                        font-weight:700;
                        line-height:1.2;
                        font-family:Arial,Helvetica,sans-serif;
                    ">
                        Authorised Sign
                    </div>
                </div>
            </div> -->

        </div>
    </div>


    <!-- Bottom footer -->
    <div style="
        position:relative;
        margin:0 -28px 0;
        height:40px;
        background:${NAVY};
        border-radius:0 0 13px 13px;
        overflow:hidden;
    ">
        <div style="
            height:40px;
            line-height:40px;
            color:#ffffff;
            font-size:11px;
            font-weight:700;
            letter-spacing:0.06em;
            text-align:center;
            text-transform:uppercase;
            font-family:Arial,Helvetica,sans-serif;
        ">
            PROJECTKART | ELECTRONICS • COMPONENTS • PROJECT KITS
        </div>

        <div style="
            position:absolute;
            right:14px;
            top:8px;
            width:28px;
            height:24px;
            opacity:0.95;
        ">
            
        </div>
    </div>

</div>
</section>`;
}
