/* =========================================================
   PROJECTKART
   Customer invoice → PDF download (no print dialog)
   ========================================================= */

import { buildCustomerInvoiceHTML } from "./invoice-render.js";
import { getBillingSettings } from "./billing-storage.js";

let libsPromise = null;

function loadPdfLibs() {
    if (libsPromise) return libsPromise;

    libsPromise = Promise.all([
        import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm"),
        import("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm")
    ]).then(([html2canvasMod, jspdfMod]) => ({
        html2canvas: html2canvasMod.default,
        jsPDF: jspdfMod.jsPDF
    }));

    return libsPromise;
}

function mountInvoice(html) {
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        width: "794px",
        background: "#ffffff",
        zIndex: "-1",
        pointerEvents: "none"
    });
    host.innerHTML = html;
    document.body.appendChild(host);
    const invoiceEl = host.querySelector(".invoice-sheet") || host.firstElementChild;
    return { host, invoiceEl };
}

async function inlineImages(root) {
    const images = [...root.querySelectorAll("img")];

    await Promise.all(images.map(async img => {
        const src = img.getAttribute("src") || "";
        if (!src || src.startsWith("data:")) return;

        try {
            const response = await fetch(src, { mode: "cors", cache: "force-cache" });
            if (!response.ok) throw new Error("Image fetch failed");
            const blob = await response.blob();
            const dataUrl = await blobToDataUrl(blob);
            img.src = dataUrl;
        } catch (error) {
            if (/^https?:\/\//i.test(src)) {
                img.removeAttribute("src");
                img.style.display = "none";
            }
        }
    }));

    await Promise.all(images.map(img => {
        if (!img.getAttribute("src")) return Promise.resolve();
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise(resolve => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            window.setTimeout(done, 2500);
        });
    }));
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Download a customer invoice PDF from bill data (preferred).
 * Never includes original price / profit.
 */
export async function downloadInvoicePdfFromBill(bill, fileName) {
    if (!bill) throw new Error("Invoice data missing.");

    const settings = getBillingSettings();
    const html = buildCustomerInvoiceHTML(bill, settings);
    const { host, invoiceEl } = mountInvoice(html);

    try {
        await downloadInvoicePdf(invoiceEl, fileName || invoiceFileName(bill.invoiceNumber));
    } finally {
        host.remove();
    }
}

/**
 * Capture a prepared invoice element and download as A4 PDF.
 */
export async function downloadInvoicePdf(invoiceEl, fileName = "ProjectKart-Invoice.pdf") {
    if (!invoiceEl) {
        throw new Error("Invoice not found.");
    }

    const { html2canvas, jsPDF } = await loadPdfLibs();
    const needsHost = !invoiceEl.closest("[aria-hidden='true']");
    let host = null;
    let target = invoiceEl;

    if (needsHost) {
        const mounted = mountInvoice(invoiceEl.outerHTML);
        host = mounted.host;
        target = mounted.invoiceEl;
    }

    try {
        await inlineImages(target);

        const canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            imageTimeout: 4000,
            width: 794,
            windowWidth: 900
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.96);
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const usableWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight - margin * 2;

        while (heightLeft > 2) {
            position = margin - (imgHeight - heightLeft);
            pdf.addPage();
            pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight, undefined, "FAST");
            heightLeft -= pageHeight - margin * 2;
        }

        const safeName = String(fileName || "ProjectKart-Invoice.pdf")
            .replace(/[^\w.\-]+/g, "_")
            .replace(/_+/g, "_");

        pdf.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
    } finally {
        if (host) host.remove();
    }
}

export function invoiceFileName(invoiceNumber) {
    const num = String(invoiceNumber || "Invoice").trim() || "Invoice";
    return `ProjectKart-${num}.pdf`;
}
