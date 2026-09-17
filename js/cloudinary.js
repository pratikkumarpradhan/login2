/* =========================================================
   PROJECTKART
   Cloudinary unsigned image uploads (browser-safe)
   ========================================================= */

export const CLOUDINARY_CLOUD_NAME = "dyp8u0ka1";
export const CLOUDINARY_UPLOAD_PRESET = "components";

const UPLOAD_URL =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
]);

export function validateImageFile(file) {
    if (!file) {
        throw new Error("Please choose an image file.");
    }

    if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error("Please upload a JPG, PNG, WEBP, or GIF image.");
    }

    if (file.size > MAX_BYTES) {
        throw new Error("Image must be 8MB or smaller.");
    }

    return true;
}

export function uploadImageToCloudinary(file, {
    onProgress
} = {}) {
    validateImageFile(file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "projectkart/components");

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", UPLOAD_URL);

        xhr.upload.addEventListener("progress", event => {
            if (!event.lengthComputable || typeof onProgress !== "function") {
                return;
            }
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
        });

        xhr.addEventListener("load", () => {
            let payload = null;

            try {
                payload = JSON.parse(xhr.responseText || "{}");
            } catch (error) {
                console.error("Cloudinary response parse error:", error);
                reject(new Error("Unable to read the Cloudinary response."));
                return;
            }

            if (xhr.status >= 200 && xhr.status < 300 && payload.secure_url) {
                resolve({
                    url: payload.secure_url,
                    publicId: payload.public_id || "",
                    width: payload.width || 0,
                    height: payload.height || 0
                });
                return;
            }

            const message = payload?.error?.message
                || "Cloudinary upload failed. Please try again.";
            console.error("Cloudinary upload error:", payload);
            reject(new Error(message));
        });

        xhr.addEventListener("error", () => {
            console.error("Cloudinary network error");
            reject(new Error("Network error while uploading the image."));
        });

        xhr.addEventListener("abort", () => {
            reject(new Error("Image upload was cancelled."));
        });

        xhr.send(formData);
    });
}
