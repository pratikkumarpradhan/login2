/* =========================================================
   PROJECTKART
   Customer invoice → PDF download (no print dialog)
   ========================================================= */

import {
    buildCustomerInvoiceHTML,
    INVOICE_PAGE_HEIGHT,
    INVOICE_PAGE_WIDTH
} from "./invoice-render.js";
import { getBillingSettings, resolvePaymentQrDataUrl } from "./billing-storage.js";

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
        width: `${INVOICE_PAGE_WIDTH}px`,
        minHeight: `${INVOICE_PAGE_HEIGHT}px`,
        background: "#ffffff",
        zIndex: "-1",
        pointerEvents: "none",
        overflow: "visible"
    });
    host.innerHTML = html;
    document.body.appendChild(host);

    const invoiceEl = host.querySelector(".invoice-sheet") || host.firstElementChild;
    if (invoiceEl) {
        invoiceEl.style.width = `${INVOICE_PAGE_WIDTH}px`;
        invoiceEl.style.minHeight = `${INVOICE_PAGE_HEIGHT}px`;
        invoiceEl.style.display = "flex";
        invoiceEl.style.flexDirection = "column";
        invoiceEl.style.boxSizing = "border-box";
    }

    return { host, invoiceEl };
}

async function inlineImages(root) {
    const images = [...root.querySelectorAll("img")];

    await Promise.all(images.map(async img => {
        const src = img.getAttribute("src") || img.src || "";
        if (!src || src.startsWith("data:")) return;

        try {
            const dataUrl = await embedImageAsDataUrl(src, img);
            if (dataUrl) {
                img.setAttribute("src", dataUrl);
                img.removeAttribute("crossorigin");
            }
        } catch (error) {
            console.error("Invoice image could not be embedded:", src, error);
        }
    }));

    await Promise.all(images.map(img => waitForImage(img)));
}

async function embedImageAsDataUrl(src, existingImg) {
    if (existingImg instanceof HTMLImageElement && existingImg.complete && existingImg.naturalWidth > 0) {
        try {
            return canvasFromImage(existingImg);
        } catch (error) {
            // fall through
        }
    }

    try {
        const absoluteUrl = new URL(src, document.baseURI).href;
        const response = await fetch(absoluteUrl, { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        return await blobToDataUrl(blob);
    } catch (error) {
        const absoluteUrl = new URL(src, document.baseURI).href;
        const img = await loadImageElement(absoluteUrl);
        return canvasFromImage(img);
    }
}

function canvasFromImage(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 300;
    canvas.height = img.naturalHeight || img.height || 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Image load failed: ${src}`));
        img.src = src;
    });
}

function waitForImage(img) {
    if (!img.getAttribute("src")) return Promise.resolve();
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        window.setTimeout(done, 5000);
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

/**
 * Download a customer invoice PDF from bill data (preferred).
 * Never includes original price / profit.
 */
export async function downloadInvoicePdfFromBill(bill, fileName) {
    if (!bill) throw new Error("Invoice data missing.");

    const settings = getBillingSettings();
    // Embed QR as data URL BEFORE html2canvas (fixes missing Scan & Pay QR in PDF)
    const qrDataUrl = await resolvePaymentQrDataUrl(settings);
    const html = buildCustomerInvoiceHTML(bill, settings, { qrDataUrl });
    const { host, invoiceEl } = mountInvoice(html);

    try {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    try {
        await inlineImages(target);
        await Promise.all([...target.querySelectorAll("img")].map(waitForImage));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const captureWidth = INVOICE_PAGE_WIDTH;
        const captureHeight = Math.max(target.scrollHeight, INVOICE_PAGE_HEIGHT);

        const canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            imageTimeout: 8000,
            width: captureWidth,
            height: captureHeight,
            windowWidth: captureWidth,
            windowHeight: captureHeight,
            scrollX: 0,
            scrollY: 0,
            onclone(clonedDoc) {
                const cloned = clonedDoc.querySelector(".invoice-sheet");
                if (!cloned) return;
                cloned.style.width = `${captureWidth}px`;
                cloned.style.minHeight = `${INVOICE_PAGE_HEIGHT}px`;
                cloned.style.height = "auto";
                cloned.style.display = "flex";
                cloned.style.flexDirection = "column";
                cloned.style.boxSizing = "border-box";
                cloned.style.transform = "none";

                cloned.querySelectorAll("th, td").forEach(cell => {
                    cell.style.verticalAlign = "middle";
                });

                const originalImgs = target.querySelectorAll("img");
                const clonedImgs = cloned.querySelectorAll("img");
                clonedImgs.forEach((img, index) => {
                    const original = originalImgs[index];
                    if (original && original.src && original.src.startsWith("data:")) {
                        img.src = original.src;
                    }
                });
            }
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.97);
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 6;
        const usableWidth = pageWidth - margin * 2;
        const usableHeight = pageHeight - margin * 2;
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        if (imgHeight <= usableHeight + 1) {
            pdf.addImage(imgData, "JPEG", margin, margin, usableWidth, imgHeight, undefined, "FAST");
        } else {
            let heightLeft = imgHeight;
            let position = margin;

            pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight, undefined, "FAST");
            heightLeft -= usableHeight;

            while (heightLeft > 2) {
                position = margin - (imgHeight - heightLeft);
                pdf.addPage();
                pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight, undefined, "FAST");
                heightLeft -= usableHeight;
            }
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
