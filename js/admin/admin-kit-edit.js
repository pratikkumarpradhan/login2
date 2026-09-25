/* =========================================================
   PROJECTKART
   Admin project kit editor
   Images → Cloudinary, documents → Firestore kits
   ========================================================= */

import {
    addKit,
    deleteKit,
    getKit,
    updateKit
} from "../kits.js";

import {
    uploadImageToCloudinary,
    validateImageFile
} from "../cloudinary.js";

import {
    createSlug,
    formatPrice,
    getQueryParam
} from "../utils.js";

import {
    guardAdminPage
} from "./admin-guard.js";

let editingId = null;
let uploadedImages = [];
let uploadsInFlight = 0;
const MAX_IMAGES = 8;

document.addEventListener("DOMContentLoaded", () => {
    initKitEditPage();
});

async function initKitEditPage() {
    const form = document.querySelector("[data-kit-form]");
    if (!form) {
        return;
    }

    await guardAdminPage();
    editingId = getQueryParam("id");

    setupImageUpload();
    setupLivePreview();
    setupSlugHelpers();
    form.addEventListener("submit", handleSave);

    document.querySelector("[data-confirm-kit-delete]")?.addEventListener("click", handleDelete);

    if (editingId) {
        await loadExistingKit(editingId);
    } else {
        updatePageLabels(false);
        setLoading(false);
    }
}

async function loadExistingKit(id) {
    setLoading(true);

    try {
        const kit = await getKit(id);
        if (!kit || !kit.name) {
            showPageError("Kit not found.");
            return;
        }

        updatePageLabels(true);
        fillForm(kit);
        updatePreview();
    } catch (error) {
        console.error("Load kit error:", error);
        showPageError(error.message || "Unable to load this kit.");
    } finally {
        setLoading(false);
    }
}

function fillForm(kit) {
    setValue("[data-kit-name]", kit.name);
    setValue("[data-kit-slug]", kit.slug || createSlug(kit.name));
    setValue("[data-kit-description-field]", kit.description);
    setValue("[data-kit-category]", kit.category || "");
    setValue("[data-kit-difficulty]", kit.difficulty || "Beginner");
    setValue("[data-kit-price]", kit.price);
    setValue("[data-kit-old-price]", kit.oldPrice || "");
    setValue("[data-kit-original-price]", kit.originalPrice || "");
    setValue("[data-kit-order]", kit.order ?? 0);
    setValue("[data-kit-badge]", kit.badge || "");
    setValue(
        "[data-kit-includes]",
        Array.isArray(kit.includes) ? kit.includes.join("\n") : String(kit.includes || "")
    );

    const active = document.querySelector("[data-kit-active]");
    const featured = document.querySelector("[data-kit-featured]");
    if (active) active.checked = kit.active !== false;
    if (featured) featured.checked = Boolean(kit.featured);

    uploadedImages = normalizeImageList(kit.images, kit.image);
    syncImageFields();
    renderImageGallery();

    const idEl = document.querySelector("[data-kit-id]");
    if (idEl) idEl.textContent = kit.id;

    document.querySelector("[data-kit-meta-card]")?.removeAttribute("hidden");
    document.querySelector("[data-kit-danger-card]")?.removeAttribute("hidden");

    const counter = document.querySelector("[data-kit-description-count]");
    if (counter) {
        counter.textContent = String(kit.description || "").length;
    }
}

function setupSlugHelpers() {
    const nameInput = document.querySelector("[data-kit-name]");
    const slugInput = document.querySelector("[data-kit-slug]");
    let slugTouched = Boolean(editingId);

    slugInput?.addEventListener("input", () => {
        slugTouched = true;
    });

    nameInput?.addEventListener("input", () => {
        if (!slugTouched && slugInput) {
            slugInput.value = createSlug(nameInput.value);
        }
        updatePreview();
    });

    document.querySelector("[data-kit-description-field]")?.addEventListener("input", event => {
        const counter = document.querySelector("[data-kit-description-count]");
        if (counter) {
            counter.textContent = String(event.currentTarget.value.length);
        }
        updatePreview();
    });

    [
        "[data-kit-price]",
        "[data-kit-old-price]",
        "[data-kit-category]",
        "[data-kit-difficulty]",
        "[data-kit-badge]"
    ].forEach(selector => {
        document.querySelector(selector)?.addEventListener("input", updatePreview);
        document.querySelector(selector)?.addEventListener("change", updatePreview);
    });
}

function setupLivePreview() {
    updatePreview();
}

function setupImageUpload() {
    const dropzone = document.querySelector("[data-kit-image-upload]");
    const fileInput = document.querySelector("[data-kit-image-file]");
    const browse = document.querySelector("[data-kit-image-browse]");
    const gallery = document.querySelector("[data-kit-image-gallery]");

    browse?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        fileInput?.click();
    });

    dropzone?.addEventListener("click", event => {
        if (event.target.closest("[data-kit-image-browse]")) {
            return;
        }
        fileInput?.click();
    });

    dropzone?.addEventListener("dragover", event => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
    });

    dropzone?.addEventListener("dragleave", () => {
        dropzone.classList.remove("is-dragging");
    });

    dropzone?.addEventListener("drop", event => {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
        const files = [...(event.dataTransfer?.files || [])];
        if (files.length) {
            handleSelectedFiles(files);
        }
    });

    fileInput?.addEventListener("change", () => {
        const files = [...(fileInput.files || [])];
        if (files.length) {
            handleSelectedFiles(files);
        }
        fileInput.value = "";
    });

    gallery?.addEventListener("click", event => {
        const remove = event.target.closest("[data-remove-image]");
        if (remove) {
            const index = Number(remove.getAttribute("data-remove-image"));
            if (Number.isFinite(index)) {
                uploadedImages.splice(index, 1);
                syncImageFields();
                renderImageGallery();
                updatePreview();
            }
            return;
        }

        const makePrimary = event.target.closest("[data-primary-image]");
        if (makePrimary) {
            const index = Number(makePrimary.getAttribute("data-primary-image"));
            if (Number.isFinite(index) && index > 0) {
                const [selected] = uploadedImages.splice(index, 1);
                uploadedImages.unshift(selected);
                syncImageFields();
                renderImageGallery();
                updatePreview();
            }
        }
    });
}

async function handleSelectedFiles(files) {
    const remaining = MAX_IMAGES - uploadedImages.length;
    if (remaining <= 0) {
        setFormStatus(`You can upload up to ${MAX_IMAGES} images.`, "error");
        return;
    }

    const selected = files.slice(0, remaining);
    uploadsInFlight += selected.length;
    setUploadProgress(0, true);
    setFormStatus(`Uploading ${selected.length} image${selected.length > 1 ? "s" : ""}...`, "info");

    let completed = 0;
    for (const file of selected) {
        try {
            validateImageFile(file);
            const result = await uploadImageToCloudinary(file, {
                folder: "projectkart/kits",
                onProgress: percent => {
                    const overall = Math.round(((completed + percent / 100) / selected.length) * 100);
                    setUploadProgress(overall, true);
                }
            });
            if (result.url && !uploadedImages.includes(result.url)) {
                uploadedImages.push(result.url);
            }
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            setFormStatus(error.message || "Image upload failed.", "error");
        } finally {
            completed += 1;
            uploadsInFlight = Math.max(0, uploadsInFlight - 1);
            setUploadProgress(Math.round((completed / selected.length) * 100), true);
        }
    }

    syncImageFields();
    renderImageGallery();
    updatePreview();
    setUploadProgress(100, false);

    if (uploadedImages.length) {
        setFormStatus(
            `${uploadedImages.length} image${uploadedImages.length > 1 ? "s" : ""} ready.`,
            "success"
        );
    }
}

function normalizeImageList(images, primary = "") {
    const list = [];
    if (Array.isArray(images)) {
        images.forEach(item => {
            const url = String(item || "").trim();
            if (url && !list.includes(url)) list.push(url);
        });
    }
    const cover = String(primary || "").trim();
    if (cover && !list.includes(cover)) list.unshift(cover);
    return list.slice(0, MAX_IMAGES);
}

function syncImageFields() {
    const primary = document.querySelector("[data-kit-image]");
    const all = document.querySelector("[data-kit-images]");
    if (primary) primary.value = uploadedImages[0] || "";
    if (all) all.value = JSON.stringify(uploadedImages);
}

function renderImageGallery() {
    const gallery = document.querySelector("[data-kit-image-gallery]");
    if (!gallery) return;

    if (!uploadedImages.length) {
        gallery.innerHTML = "";
        gallery.hidden = true;
        gallery.setAttribute("hidden", "");
        return;
    }

    gallery.hidden = false;
    gallery.removeAttribute("hidden");
    gallery.innerHTML = uploadedImages.map((url, index) => `
        <article class="admin-image-gallery__item${index === 0 ? " is-primary" : ""}">
            <img src="${escapeAttr(url)}" alt="Kit image ${index + 1}">
            <div class="admin-image-gallery__actions">
                ${index === 0
                    ? `<span class="admin-image-gallery__badge">Cover</span>`
                    : `<button type="button" class="admin-image-gallery__btn" data-primary-image="${index}">Make cover</button>`
                }
                <button type="button" class="admin-image-gallery__btn admin-image-gallery__btn--danger" data-remove-image="${index}" aria-label="Remove image">Remove</button>
            </div>
        </article>
    `).join("");
}

async function handleSave(event) {
    event.preventDefault();

    const button = document.querySelector("[data-kit-save]");
    const buttonText = document.querySelector("[data-kit-save-text]");
    const spinner = document.querySelector("[data-kit-save-spinner]");
    const status = document.querySelector("[data-kit-form-status]");

    try {
        if (uploadsInFlight > 0) {
            throw new Error("Please wait for the image upload to finish.");
        }

        const payload = readForm();

        if (!payload.image || !payload.images.length) {
            throw new Error("Please upload at least one kit image before saving.");
        }

        if (button) button.disabled = true;
        if (buttonText) buttonText.textContent = editingId ? "Saving..." : "Creating...";
        if (spinner) spinner.hidden = false;
        setFormStatus(editingId ? "Saving kit..." : "Creating kit...", "info");

        if (editingId) {
            await updateKit(editingId, payload);
            setFormStatus("Kit updated successfully.", "success");
        } else {
            const id = await addKit(payload);
            editingId = id;
            updatePageLabels(true);
            setFormStatus("Kit added successfully.", "success");
        }

        window.setTimeout(() => {
            window.location.href = "../project-kits.html";
        }, 700);
    } catch (error) {
        console.error("Save kit error:", error);
        setFormStatus(error.message || "Unable to save kit.", "error");
        if (status) status.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
        if (button) button.disabled = false;
        if (buttonText) buttonText.textContent = editingId ? "Save changes" : "Save kit";
        if (spinner) spinner.hidden = true;
    }
}

async function handleDelete() {
    if (!editingId) {
        return;
    }

    if (!window.confirm("Delete this kit permanently?")) {
        return;
    }

    try {
        await deleteKit(editingId);
        window.location.href = "../project-kits.html";
    } catch (error) {
        console.error("Delete kit error:", error);
        setFormStatus(error.message || "Unable to delete kit.", "error");
    }
}

function readForm() {
    return {
        name: valueOf("[data-kit-name]"),
        slug: valueOf("[data-kit-slug]") || createSlug(valueOf("[data-kit-name]")),
        description: valueOf("[data-kit-description-field]"),
        category: valueOf("[data-kit-category]") || "Project Kit",
        difficulty: valueOf("[data-kit-difficulty]") || "Beginner",
        includes: valueOf("[data-kit-includes]"),
        price: valueOf("[data-kit-price]"),
        oldPrice: valueOf("[data-kit-old-price]"),
        originalPrice: valueOf("[data-kit-original-price]"),
        order: valueOf("[data-kit-order]") || 0,
        badge: valueOf("[data-kit-badge]"),
        image: uploadedImages[0] || valueOf("[data-kit-image]"),
        images: uploadedImages.slice(),
        active: Boolean(document.querySelector("[data-kit-active]")?.checked),
        featured: Boolean(document.querySelector("[data-kit-featured]")?.checked)
    };
}

function updatePreview() {
    const name = valueOf("[data-kit-name]") || "Kit name";
    const description = valueOf("[data-kit-description-field]") || "Kit description will appear here.";
    const category = valueOf("[data-kit-category]") || "Project Kit";
    const price = Number(valueOf("[data-kit-price]") || 0);
    const oldPrice = Number(valueOf("[data-kit-old-price]") || 0);
    const image = uploadedImages[0] || valueOf("[data-kit-image]");

    setText("[data-preview-name]", name);
    setText("[data-preview-description]", description);
    setText("[data-preview-category]", category);
    setText("[data-preview-price]", formatPrice(price));

    const old = document.querySelector("[data-preview-old-price]");
    if (old) {
        if (oldPrice > price) {
            old.hidden = false;
            old.textContent = formatPrice(oldPrice);
        } else {
            old.hidden = true;
        }
    }

    const previewImage = document.querySelector("[data-preview-image]");
    if (previewImage) {
        if (image) {
            previewImage.innerHTML = `<img src="${escapeAttr(image)}" alt="">`;
        } else {
            previewImage.innerHTML = `<span>Kit image</span>`;
        }
    }
}

function setUploadProgress(percent, visible) {
    const box = document.querySelector("[data-kit-upload-progress]");
    const label = document.querySelector("[data-kit-upload-percent]");
    const bar = document.querySelector("[data-kit-upload-bar]");
    if (box) box.hidden = !visible && percent < 100;
    if (!visible && percent >= 100) {
        window.setTimeout(() => {
            if (box) box.hidden = true;
        }, 600);
    }
    if (label) label.textContent = `${percent}%`;
    if (bar) bar.style.width = `${percent}%`;
}

function updatePageLabels(isEdit) {
    setText("[data-kit-breadcrumb]", isEdit ? "Edit kit" : "Add kit");
    setText("[data-kit-page-title]", isEdit ? "Edit kit" : "Add kit");
    setText("[data-kit-heading]", isEdit ? "Edit kit" : "Add kit");
    setText("[data-kit-page-copy]", isEdit
        ? "Update kit information, pricing, includes and Cloudinary image."
        : "Add kit information, pricing, includes and upload an image to Cloudinary.");
    setText("[data-kit-save-text]", isEdit ? "Save changes" : "Save kit");
}

function setLoading(isLoading) {
    const loading = document.querySelector("[data-kit-page-loading]");
    const form = document.querySelector("[data-kit-form]");
    if (loading) loading.hidden = !isLoading;
    if (form) form.hidden = isLoading;
}

function showPageError(message) {
    const error = document.querySelector("[data-kit-page-error]");
    const form = document.querySelector("[data-kit-form]");
    const loading = document.querySelector("[data-kit-page-loading]");
    if (loading) loading.hidden = true;
    if (form) form.hidden = true;
    if (error) {
        error.hidden = false;
        const messageEl = document.querySelector("[data-kit-page-error-message]");
        if (messageEl) messageEl.textContent = message;
    }
}

function setFormStatus(message, type = "") {
    const status = document.querySelector("[data-kit-form-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.status = type;
}

function valueOf(selector) {
    return document.querySelector(selector)?.value.trim() || "";
}

function setValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.value = value ?? "";
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
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
