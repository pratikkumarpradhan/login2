/* =========================================================
   PROJECTKART
   Admin product / component editor
   Images → Cloudinary, documents → Firestore components
   ========================================================= */

import {
    getCategories,
    getAllCategories
} from "../categories.js";

import {
    FALLBACK_CATEGORIES
} from "../catalog-data.js";

import {
    addComponent,
    deleteComponent,
    getComponent,
    updateComponent
} from "../components.js";

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
let categories = [];
let uploadsInFlight = 0;
const MAX_IMAGES = 8;

document.addEventListener("DOMContentLoaded", () => {
    initProductEditPage();
});

async function initProductEditPage() {
    const form = document.querySelector("[data-product-form]");
    if (!form) {
        return;
    }

    await guardAdminPage();
    editingId = getQueryParam("id");

    await loadCategories();
    setupImageUpload();
    setupLivePreview();
    setupSlugHelpers();
    form.addEventListener("submit", handleSave);

    document.querySelector("[data-confirm-product-delete]")?.addEventListener("click", handleDelete);

    if (editingId) {
        await loadExistingComponent(editingId);
    } else {
        updatePageLabels(false);
        setLoading(false);
    }
}

async function loadCategories() {
    const select = document.querySelector("[data-product-category]");
    if (!select) {
        return;
    }

    try {
        categories = await getAllCategories();
        if (!categories.length) {
            categories = await getCategories();
        }
    } catch (error) {
        console.error("Admin categories load error:", error);
        try {
            categories = await getCategories();
        } catch (innerError) {
            console.error("Admin fallback categories load error:", innerError);
            categories = [];
        }
    }

    if (!categories.length) {
        categories = FALLBACK_CATEGORIES.slice();
    }

    const previous = select.value;
    select.innerHTML = `<option value="">Select a category</option>` + categories.map(category => `
        <option value="${escapeAttr(category.id)}">${escapeHtml(category.name)}</option>
    `).join("");

    if (previous && categories.some(item => item.id === previous)) {
        select.value = previous;
    }

    select.disabled = false;
    select.removeAttribute("disabled");

    select.addEventListener("change", syncCategoryName);
    syncCategoryName();
}

function syncCategoryName() {
    const select = document.querySelector("[data-product-category]");
    const nameInput = document.querySelector("[data-product-category-name]");
    if (!select || !nameInput) {
        return;
    }

    const selected = categories.find(item => item.id === select.value);
    nameInput.value = selected?.name || "";
    updatePreview();
}

async function loadExistingComponent(id) {
    setLoading(true);

    try {
        const component = await getComponent(id);
        if (!component || !component.name) {
            showPageError("Component not found.");
            return;
        }

        updatePageLabels(true);
        fillForm(component);
        updatePreview();
    } catch (error) {
        console.error("Load component error:", error);
        showPageError(error.message || "Unable to load this component.");
    } finally {
        setLoading(false);
    }
}

function fillForm(component) {
    setValue("[data-product-name]", component.name);
    setValue("[data-product-slug]", component.slug || createSlug(component.name));
    setValue("[data-product-description-field]", component.description);
    setValue("[data-product-price]", component.price);
    setValue("[data-product-old-price]", component.oldPrice || "");
    setValue("[data-product-original-price]", component.originalPrice || "");
    setValue("[data-product-stock]", component.stock);
    setValue("[data-product-badge]", component.badge || "");
    setValue("[data-product-category]", component.categoryId || "");
    syncCategoryName();
    if (!valueOf("[data-product-category-name]")) {
        setValue("[data-product-category-name]", component.categoryName || "");
    }

    const active = document.querySelector("[data-product-active]");
    const featured = document.querySelector("[data-product-featured]");
    if (active) active.checked = component.active !== false;
    if (featured) featured.checked = Boolean(component.featured);

    uploadedImages = normalizeImageList(component.images, component.image);
    syncImageFields();
    renderImageGallery();

    const idEl = document.querySelector("[data-product-id]");
    if (idEl) idEl.textContent = component.id;

    document.querySelector("[data-product-meta-card]")?.removeAttribute("hidden");
    document.querySelector("[data-product-description-count]") && (
        document.querySelector("[data-product-description-count]").textContent =
            String(component.description || "").length
    );
}

function setupSlugHelpers() {
    const nameInput = document.querySelector("[data-product-name]");
    const slugInput = document.querySelector("[data-product-slug]");
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

    document.querySelector("[data-product-description-field]")?.addEventListener("input", event => {
        const counter = document.querySelector("[data-product-description-count]");
        if (counter) {
            counter.textContent = String(event.currentTarget.value.length);
        }
        updatePreview();
    });

    ["[data-product-price]", "[data-product-old-price]", "[data-product-badge]"].forEach(selector => {
        document.querySelector(selector)?.addEventListener("input", updatePreview);
    });
}

function setupLivePreview() {
    updatePreview();
}

function setupImageUpload() {
    const dropzone = document.querySelector("[data-product-image-upload]");
    const fileInput = document.querySelector("[data-product-image-file]");
    const browse = document.querySelector("[data-product-image-browse]");
    const gallery = document.querySelector("[data-product-image-gallery]");

    browse?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        fileInput?.click();
    });

    dropzone?.addEventListener("click", event => {
        if (event.target.closest("[data-product-image-browse]")) {
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
    const primary = document.querySelector("[data-product-image]");
    const all = document.querySelector("[data-product-images]");
    if (primary) primary.value = uploadedImages[0] || "";
    if (all) all.value = JSON.stringify(uploadedImages);
}

function renderImageGallery() {
    const gallery = document.querySelector("[data-product-image-gallery]");
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
            <img src="${escapeAttr(url)}" alt="Component image ${index + 1}">
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

    const status = document.querySelector("[data-product-form-status]");
    const button = document.querySelector("[data-product-save]");
    const buttonText = document.querySelector("[data-product-save-text]");
    const spinner = document.querySelector("[data-product-save-spinner]");

    try {
        if (uploadsInFlight > 0) {
            throw new Error("Please wait for the image upload to finish.");
        }

        const payload = readForm();

        if (!payload.image || !payload.images.length) {
            throw new Error("Please upload at least one component image before saving.");
        }

        if (button) button.disabled = true;
        if (buttonText) buttonText.textContent = editingId ? "Saving..." : "Creating...";
        if (spinner) spinner.hidden = false;
        setFormStatus(editingId ? "Saving component..." : "Creating component...", "info");

        if (editingId) {
            await updateComponent(editingId, payload);
            setFormStatus("Component updated successfully.", "success");
            window.setTimeout(() => {
                window.location.href = "../shop.html";
            }, 700);
        } else {
            const id = await addComponent(payload);
            editingId = id;
            updatePageLabels(true);
            setFormStatus("Component added successfully.", "success");
            window.setTimeout(() => {
                window.location.href = "../shop.html";
            }, 700);
            return;
        }
    } catch (error) {
        console.error("Save component error:", error);
        setFormStatus(error.message || "Unable to save component.", "error");
        if (status) status.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
        if (button) button.disabled = false;
        if (buttonText) buttonText.textContent = editingId ? "Save changes" : "Save product";
        if (spinner) spinner.hidden = true;
    }
}

async function handleDelete() {
    if (!editingId) {
        return;
    }

    if (!window.confirm("Delete this component permanently?")) {
        return;
    }

    try {
        await deleteComponent(editingId);
        window.location.href = "../shop.html";
    } catch (error) {
        console.error("Delete component error:", error);
        setFormStatus(error.message || "Unable to delete component.", "error");
    }
}

function readForm() {
    return {
        name: valueOf("[data-product-name]"),
        slug: valueOf("[data-product-slug]") || createSlug(valueOf("[data-product-name]")),
        description: valueOf("[data-product-description-field]"),
        price: valueOf("[data-product-price]"),
        oldPrice: valueOf("[data-product-old-price]"),
        originalPrice: valueOf("[data-product-original-price]"),
        stock: valueOf("[data-product-stock]"),
        badge: valueOf("[data-product-badge]"),
        categoryId: valueOf("[data-product-category]"),
        categoryName: valueOf("[data-product-category-name]"),
        image: uploadedImages[0] || valueOf("[data-product-image]"),
        images: uploadedImages.slice(),
        active: Boolean(document.querySelector("[data-product-active]")?.checked),
        featured: Boolean(document.querySelector("[data-product-featured]")?.checked)
    };
}

function updatePreview() {
    const name = valueOf("[data-product-name]") || "Component name";
    const description = valueOf("[data-product-description-field]") || "Component description will appear here.";
    const category = valueOf("[data-product-category-name]") || "Category";
    const price = Number(valueOf("[data-product-price]") || 0);
    const oldPrice = Number(valueOf("[data-product-old-price]") || 0);
    const image = uploadedImages[0] || valueOf("[data-product-image]");

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
            previewImage.innerHTML = `<span>Component image</span>`;
        }
    }
}


function setUploadProgress(percent, visible) {
    const box = document.querySelector("[data-product-upload-progress]");
    const label = document.querySelector("[data-product-upload-percent]");
    const bar = document.querySelector("[data-product-upload-bar]");
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
    setText("[data-product-breadcrumb]", isEdit ? "Edit component" : "Add component");
    setText("[data-product-page-title]", isEdit ? "Edit component" : "Add component");
    setText("[data-product-heading]", isEdit ? "Edit component" : "Add component");
    setText("[data-product-description]", isEdit
        ? "Update component information, pricing, stock and Cloudinary image."
        : "Add component information, pricing, stock and upload an image to Cloudinary.");
    setText("[data-product-save-text]", isEdit ? "Save changes" : "Save component");
}

function setLoading(isLoading) {
    const loading = document.querySelector("[data-product-page-loading]");
    const form = document.querySelector("[data-product-form]");
    if (loading) loading.hidden = !isLoading;
    if (form) form.hidden = isLoading;
}

function showPageError(message) {
    const error = document.querySelector("[data-product-page-error]");
    const form = document.querySelector("[data-product-form]");
    const loading = document.querySelector("[data-product-page-loading]");
    if (loading) loading.hidden = true;
    if (form) form.hidden = true;
    if (error) {
        error.hidden = false;
        const messageEl = document.querySelector("[data-product-page-error-message]");
        if (messageEl) messageEl.textContent = message;
    }
}

function setFormStatus(message, type = "") {
    const status = document.querySelector("[data-product-form-status]");
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
