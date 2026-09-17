/* =========================================================
   PROJECTKART
   Firestore components catalogue
   Collection name is exactly: components
   ========================================================= */

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    limit
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase.js";

import {
    createSlug
} from "./utils.js";

import {
    FALLBACK_PRODUCTS
} from "./catalog-data.js";

export const COMPONENTS_COLLECTION = "components";

function componentsRef() {
    return collection(db, COMPONENTS_COLLECTION);
}

function componentDoc(id) {
    return doc(db, COMPONENTS_COLLECTION, id);
}

function mapComponent(document) {
    return {
        id: document.id,
        ...document.data()
    };
}

function normalizeComponentInput(component = {}, {
    isCreate = false
} = {}) {
    const name = String(component.name || "").trim();

    if (!name) {
        throw new Error("Component name is required.");
    }

    const description = String(component.description || "").trim();
    if (!description) {
        throw new Error("Component description is required.");
    }

    const categoryId = String(component.categoryId || "").trim();
    if (!categoryId) {
        throw new Error("Please select a category.");
    }

    const price = Number(component.price);
    if (!Number.isFinite(price) || price < 0) {
        throw new Error("Please enter a valid price.");
    }

    const stock = Number(component.stock);
    if (!Number.isFinite(stock) || stock < 0) {
        throw new Error("Please enter a valid stock quantity.");
    }

    const image = String(component.image || "").trim();
    if (isCreate && !image) {
        throw new Error("Please upload a component image.");
    }

    const data = {
        name,
        slug: String(component.slug || createSlug(name)).trim() || createSlug(name),
        description,
        price,
        oldPrice: Number(component.oldPrice) > 0 ? Number(component.oldPrice) : 0,
        stock,
        categoryId,
        categoryName: String(component.categoryName || "").trim(),
        image,
        badge: String(component.badge || "").trim(),
        featured: Boolean(component.featured),
        active: component.active !== false,
        updatedAt: serverTimestamp()
    };

    if (isCreate) {
        data.createdAt = serverTimestamp();
    }

    return data;
}

export async function getComponents() {
    try {
        const componentQuery = query(
            componentsRef(),
            where("active", "==", true),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(componentQuery);

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(mapComponent);
    } catch (error) {
        console.error("Unable to load components from Firebase:", error);
        throw error;
    }
}

export async function getProducts() {
    try {
        const live = await getComponents();
        return live.length ? live : FALLBACK_PRODUCTS;
    } catch (error) {
        console.error("Unable to load products from Firebase:", error);
        return FALLBACK_PRODUCTS;
    }
}

export function watchActiveComponents(onData, onError) {
    const componentQuery = query(
        componentsRef(),
        where("active", "==", true),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        componentQuery,
        snapshot => {
            onData(snapshot.docs.map(mapComponent));
        },
        error => {
            console.error("Components listener error:", error);
            if (typeof onError === "function") {
                onError(error);
            }
        }
    );
}

export function watchFeaturedComponents(onData, onError, maximum = 8) {
    const componentQuery = query(
        componentsRef(),
        where("active", "==", true),
        where("featured", "==", true),
        orderBy("createdAt", "desc"),
        limit(maximum)
    );

    return onSnapshot(
        componentQuery,
        snapshot => {
            onData(snapshot.docs.map(mapComponent));
        },
        error => {
            console.error("Featured components listener error:", error);
            if (typeof onError === "function") {
                onError(error);
            }
        }
    );
}

export async function getFeaturedProducts(maximum = 8) {
    try {
        const componentQuery = query(
            componentsRef(),
            where("active", "==", true),
            where("featured", "==", true),
            orderBy("createdAt", "desc"),
            limit(maximum)
        );
        const snapshot = await getDocs(componentQuery);
        return snapshot.docs.map(mapComponent);
    } catch (error) {
        console.error("Unable to load featured components:", error);
        return FALLBACK_PRODUCTS.filter(item => item.featured && item.active !== false).slice(0, maximum);
    }
}

export async function getComponent(componentId) {
    if (!componentId) {
        return null;
    }

    try {
        const snapshot = await getDoc(componentDoc(componentId));
        if (snapshot.exists()) {
            return mapComponent(snapshot);
        }
    } catch (error) {
        console.error("Unable to load component from Firebase:", error);
    }

    return FALLBACK_PRODUCTS.find(item => item.id === componentId) || null;
}

export async function getProduct(productId) {
    return getComponent(productId);
}

export async function getComponentsByCategory(categoryId) {
    if (!categoryId) {
        return [];
    }

    try {
        const componentQuery = query(
            componentsRef(),
            where("categoryId", "==", categoryId),
            where("active", "==", true),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(componentQuery);

        if (!snapshot.empty) {
            return snapshot.docs.map(mapComponent);
        }

        return [];
    } catch (error) {
        console.error("Unable to load category components:", error);
        return FALLBACK_PRODUCTS.filter(
            item => item.categoryId === categoryId || item.categoryName === categoryId
        );
    }
}

export async function getProductsByCategory(categoryId) {
    return getComponentsByCategory(categoryId);
}

export async function searchProducts(searchTerm) {
    const products = await getProducts();
    const search = String(searchTerm || "").toLowerCase().trim();

    if (!search) {
        return products;
    }

    return products.filter(product => {
        const haystack = `${product.name || ""} ${product.description || ""} ${product.categoryName || ""}`.toLowerCase();
        return haystack.includes(search);
    });
}

export async function getAllComponents() {
    const snapshot = await getDocs(query(componentsRef(), orderBy("createdAt", "desc")));
    return snapshot.docs.map(mapComponent);
}

export async function getAllProducts() {
    return getAllComponents();
}

export async function addComponent(component) {
    const data = normalizeComponentInput(component, { isCreate: true });
    const reference = await addDoc(componentsRef(), data);
    return reference.id;
}

export async function addProduct(product) {
    return addComponent(product);
}

export async function updateComponent(componentId, component) {
    if (!componentId) {
        throw new Error("Component ID is required.");
    }

    const data = normalizeComponentInput(component, { isCreate: false });

    if (!data.image) {
        delete data.image;
    }

    await updateDoc(componentDoc(componentId), data);
    return true;
}

export async function updateProduct(productId, product) {
    return updateComponent(productId, product);
}

export async function deleteComponent(componentId) {
    if (!componentId) {
        throw new Error("Component ID is required.");
    }

    await deleteDoc(componentDoc(componentId));
    return true;
}

export async function deleteProduct(productId) {
    return deleteComponent(productId);
}

export async function setComponentActive(componentId, active) {
    if (!componentId) {
        throw new Error("Component ID is required.");
    }

    await updateDoc(componentDoc(componentId), {
        active: Boolean(active),
        updatedAt: serverTimestamp()
    });

    return true;
}

export async function setProductActive(productId, active) {
    return setComponentActive(productId, active);
}

export async function setComponentFeatured(componentId, featured) {
    await updateDoc(componentDoc(componentId), {
        featured: Boolean(featured),
        updatedAt: serverTimestamp()
    });
    return true;
}

export async function setProductFeatured(productId, featured) {
    return setComponentFeatured(productId, featured);
}
