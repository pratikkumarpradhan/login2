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

/**
 * Mount invoice off-screen but KEEP it paint-able for html2canvas.
 * Do NOT use visibility:hidden / opacity:0 — those produce blank PDFs.
 */
function mountInvoice(html) {
    const host = document.createElement("div");
    host.setAttribute("data-invoice-pdf-host", "true");
    Object.assign(host.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: `${INVOICE_PAGE_WIDTH}px`,
        minHeight: `${INVOICE_PAGE_HEIGHT}px`,
        margin: "0",
        padding: "0",
        background: "#ffffff",
        zIndex: "2147483000",
        opacity: "1",
        visibility: "visible",
        pointerEvents: "none",
        overflow: "visible",
        transform: "translateX(-100vw)"
    });
    host.innerHTML = html;
    document.body.appendChild(host);

    const invoiceEl = host.querySelector(".invoice-sheet") || host.firstElementChild;
    if (invoiceEl) {
        Object.assign(invoiceEl.style, {
            width: `${INVOICE_PAGE_WIDTH}px`,
            minHeight: `${INVOICE_PAGE_HEIGHT}px`,
            maxWidth: `${INVOICE_PAGE_WIDTH}px`,
            margin: "0",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            opacity: "1",
            visibility: "visible",
            transform: "none",
            background: "#ffffff"
        });
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
    if (!img.getAttribute("src") && !img.src) return Promise.resolve();
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

function waitFrames(count = 2) {
    return new Promise(resolve => {
        let left = count;
        const tick = () => {
            left -= 1;
            if (left <= 0) resolve();
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

/**
 * Download a customer invoice PDF from bill data (preferred).
 * Never includes original price / profit.
 */
export async function downloadInvoicePdfFromBill(bill, fileName) {
    if (!bill) throw new Error("Invoice data missing.");

    const settings = getBillingSettings();
    const qrDataUrl = await resolvePaymentQrDataUrl(settings);
    const html = buildCustomerInvoiceHTML(bill, settings, { qrDataUrl });
    const { host, invoiceEl } = mountInvoice(html);

    try {
        if (!invoiceEl) throw new Error("Invoice layout failed to render.");
        await waitFrames(2);
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
    const alreadyMounted = Boolean(invoiceEl.closest("[data-invoice-pdf-host]"));
    let host = null;
    let target = invoiceEl;

    if (!alreadyMounted) {
        const mounted = mountInvoice(invoiceEl.outerHTML);
        host = mounted.host;
        target = mounted.invoiceEl;
        await waitFrames(2);
    }

    try {
        if (!target) throw new Error("Invoice not found.");

        // Ensure capture target is paint-able
        target.style.opacity = "1";
        target.style.visibility = "visible";
        target.style.transform = "none";
        target.style.background = "#ffffff";

        await inlineImages(target);
        await Promise.all([...target.querySelectorAll("img")].map(waitForImage));
        await waitFrames(2);

        const captureWidth = INVOICE_PAGE_WIDTH;
        const captureHeight = Math.max(
            target.scrollHeight || 0,
            target.offsetHeight || 0,
            INVOICE_PAGE_HEIGHT
        );

        if (captureHeight < 100) {
            throw new Error("Invoice height is invalid. Try again.");
        }

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
            onclone(clonedDoc, element) {
                const cloned = element || clonedDoc.querySelector(".invoice-sheet");
                if (!cloned) return;

                cloned.style.width = `${captureWidth}px`;
                cloned.style.minHeight = `${INVOICE_PAGE_HEIGHT}px`;
                cloned.style.height = "auto";
                cloned.style.display = "flex";
                cloned.style.flexDirection = "column";
                cloned.style.boxSizing = "border-box";
                cloned.style.transform = "none";
                cloned.style.opacity = "1";
                cloned.style.visibility = "visible";
                cloned.style.background = "#ffffff";
                cloned.style.position = "static";
                cloned.style.left = "auto";
                cloned.style.top = "auto";

                // Parent host in clone must also stay visible for painting
                const clonedHost = cloned.closest("[data-invoice-pdf-host]");
                if (clonedHost) {
                    clonedHost.style.transform = "none";
                    clonedHost.style.opacity = "1";
                    clonedHost.style.visibility = "visible";
                    clonedHost.style.left = "0";
                    clonedHost.style.top = "0";
                    clonedHost.style.position = "static";
                }

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
                    img.style.opacity = "1";
                    img.style.visibility = "visible";
                });
            }
        });

        if (!canvas.width || !canvas.height) {
            throw new Error("PDF capture failed (empty canvas).");
        }

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
