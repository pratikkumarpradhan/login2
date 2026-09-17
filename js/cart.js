/* =========================================================
   PROJECTKART
   Shopping Cart
   ========================================================= */

import {
    escapeHTML,
    formatPrice,
    showToast
} from "./utils.js";

import {
    buildSelectedCartWhatsAppMessage,
    openWhatsAppOrder
} from "./whatsapp.js";

const CART_KEY =
"projectkart_cart";


/*
|--------------------------------------------------------------------------
| Get Cart
|--------------------------------------------------------------------------
*/

export function getCart() {

   try {

       const stored =
           localStorage.getItem(
               CART_KEY
           );

       if (!stored) {
           return [];
       }

       const cart =
           JSON.parse(
               stored
           );

       return Array.isArray(cart)
           ? cart
           : [];

   } catch (error) {

       console.error(
           "Unable to read cart:",
           error
       );

       return [];
   }
}


/*
|--------------------------------------------------------------------------
| Save Cart
|--------------------------------------------------------------------------
*/

function saveCart(
   cart
) {

   localStorage.setItem(
       CART_KEY,
       JSON.stringify(cart)
   );

   updateCartCount();

   window.dispatchEvent(
       new CustomEvent(
           "projectkart:cart-updated"
       )
   );
}


/*
|--------------------------------------------------------------------------
| Add Product
|--------------------------------------------------------------------------
*/

export function addToCart(
   product,
   quantity = 1
) {

   if (!product?.id) {
       throw new Error(
           "Invalid product."
       );
   }


   const cart =
       getCart();


   const existing =
       cart.find(
           item =>
               item.id ===
               product.id
       );


   const amount =
       Math.max(
           1,
           Number(quantity)
       );


   if (existing) {

       existing.quantity +=
           amount;

   } else {

       cart.push({

           id:
               product.id,

           name:
               product.name || "",

           price:
               Number(
                   product.price || 0
               ),

           image:
               product.image || "",

           category:
               product.category || product.categoryName || "",

           quantity:
               amount,

           stock:
               Number(
                   product.stock || 0
               )
       });
   }


   /*
   |--------------------------------------------------------------------------
   | Prevent quantity above stock
   |--------------------------------------------------------------------------
   */

   const item =
       cart.find(
           item =>
               item.id ===
               product.id
       );


   if (
       product.stock !== undefined
       &&
       product.stock !== null
       &&
       Number(product.stock) > 0
   ) {

       item.quantity =
           Math.min(
               item.quantity,
               Number(product.stock)
           );
   }


   saveCart(cart);


   return cart;
}


/*
|--------------------------------------------------------------------------
| Remove Product
|--------------------------------------------------------------------------
*/

export function removeFromCart(
   productId
) {

   const cart =
       getCart();


   const updated =
       cart.filter(
           item =>
               item.id !==
               productId
       );


   saveCart(updated);


   return updated;
}


/*
|--------------------------------------------------------------------------
| Update Quantity
|--------------------------------------------------------------------------
*/

export function updateCartQuantity(
   productId,
   quantity
) {

   const cart =
       getCart();


   const item =
       cart.find(
           product =>
               product.id ===
               productId
       );


   if (!item) {
       return cart;
   }


   let amount =
       Number(quantity);


   if (
       !Number.isFinite(amount)
       ||
       amount < 1
   ) {

       amount = 1;
   }


   if (
       item.stock > 0
   ) {

       amount =
           Math.min(
               amount,
               item.stock
           );
   }


   item.quantity =
       amount;


   saveCart(cart);


   return cart;
}


/*
|--------------------------------------------------------------------------
| Clear Cart
|--------------------------------------------------------------------------
*/

export function clearCart() {

   localStorage.removeItem(
       CART_KEY
   );


   updateCartCount();


   window.dispatchEvent(
       new CustomEvent(
           "projectkart:cart-updated"
       )
   );
}


/*
|--------------------------------------------------------------------------
| Cart Count
|--------------------------------------------------------------------------
*/

export function getCartCount() {

   return getCart().reduce(
       (
           total,
           item
       ) => {

           return total +
               Number(
                   item.quantity || 0
               );

       },
       0
   );
}


/*
|--------------------------------------------------------------------------
| Cart Subtotal
|--------------------------------------------------------------------------
*/

export function getCartSubtotal() {

   return getCart().reduce(
       (
           total,
           item
       ) => {

           return total +
               (
                   Number(
                       item.price || 0
                   )
                   *
                   Number(
                       item.quantity || 0
                   )
               );

       },
       0
   );
}


/*
|--------------------------------------------------------------------------
| Update Cart Count UI
|--------------------------------------------------------------------------
*/

export function updateCartCount() {

   const count =
       getCartCount();


   const elements =
       document.querySelectorAll(
           "[data-cart-count], #cartCount, #mobileCartCount"
       );


   elements.forEach(
       element => {

           element.textContent =
               count;

           element.classList.toggle(
               "hidden",
               count === 0
           );

           element.classList.toggle(
               "is-empty",
               count === 0
           );
       }
   );
}


/*
|--------------------------------------------------------------------------
| Initialize Cart
|--------------------------------------------------------------------------
*/

export function initCart() {

   updateCartCount();


   window.addEventListener(
       "storage",
       updateCartCount
   );


   window.addEventListener(
       "projectkart:cart-updated",
       updateCartCount
   );
}


/*
|--------------------------------------------------------------------------
| Cart Page UI
|--------------------------------------------------------------------------
*/

const selectedCartIds = new Set();
const seenCartIds = new Set();
let cartSelectionReady = false;

document.addEventListener("DOMContentLoaded", () => {
    initCart();

    if (document.querySelector("[data-cart-items]")) {
        initCartPage();
    }
});

function initCartPage() {
    const itemsRoot = document.querySelector("[data-cart-items]");
    if (!itemsRoot) {
        return;
    }

    itemsRoot.addEventListener("click", handleCartItemsClick);
    itemsRoot.addEventListener("change", handleCartItemsChange);

    document.querySelector("[data-cart-clear]")?.addEventListener("click", () => {
        if (!getCart().length) {
            return;
        }
        if (!window.confirm("Clear all items from your cart?")) {
            return;
        }
        selectedCartIds.clear();
        clearCart();
        renderCartPage();
        showToast("Cart cleared.", "success");
    });

    document.querySelector("[data-cart-select-all]")?.addEventListener("change", event => {
        const checked = Boolean(event.currentTarget.checked);
        const cart = getCart();
        selectedCartIds.clear();
        if (checked) {
            cart.forEach(item => selectedCartIds.add(item.id));
        }
        renderCartPage();
    });

    document.querySelector("[data-cart-whatsapp]")?.addEventListener("click", () => {
        orderSelectedOnWhatsApp();
    });

    window.addEventListener("projectkart:cart-updated", () => {
        syncSelectionWithCart();
        renderCartPage();
    });

    syncSelectionWithCart(true);
    cartSelectionReady = true;
    renderCartPage();
}

function syncSelectionWithCart(selectAllNew = false) {
    const cart = getCart();
    const ids = new Set(cart.map(item => item.id));

    [...selectedCartIds].forEach(id => {
        if (!ids.has(id)) {
            selectedCartIds.delete(id);
        }
    });

    [...seenCartIds].forEach(id => {
        if (!ids.has(id)) {
            seenCartIds.delete(id);
        }
    });

    cart.forEach(item => {
        const isNew = !seenCartIds.has(item.id);
        seenCartIds.add(item.id);

        if (selectAllNew || !cartSelectionReady || isNew) {
            selectedCartIds.add(item.id);
        }
    });
}

function renderCartPage() {
    const cart = getCart();
    const empty = document.querySelector("[data-cart-empty]");
    const content = document.querySelector("[data-cart-content]");
    const itemsRoot = document.querySelector("[data-cart-items]");
    const countLabel = document.querySelector("[data-cart-item-count]");
    const loading = document.querySelector("[data-cart-loading]");

    if (loading) {
        loading.hidden = true;
        loading.setAttribute("hidden", "");
    }

    if (!cart.length) {
        selectedCartIds.clear();
        if (empty) {
            empty.hidden = false;
            empty.removeAttribute("hidden");
        }
        if (content) {
            content.hidden = true;
            content.setAttribute("hidden", "");
        }
        if (itemsRoot) itemsRoot.innerHTML = "";
        updateCartSummary([]);
        updateWhatsAppButtonState([]);
        return;
    }

    if (empty) {
        empty.hidden = true;
        empty.setAttribute("hidden", "");
    }
    if (content) {
        content.hidden = false;
        content.removeAttribute("hidden");
    }

    if (countLabel) {
        const units = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        countLabel.textContent = `${cart.length} ${cart.length === 1 ? "item" : "items"} · ${units} units`;
    }

    if (itemsRoot) {
        itemsRoot.innerHTML = cart.map(item => {
            const quantity = Math.max(1, Number(item.quantity) || 1);
            const unit = Number(item.price) || 0;
            const lineTotal = unit * quantity;
            const checked = selectedCartIds.has(item.id);

            return `
                <article class="cart-item" data-cart-item-id="${escapeHTML(item.id)}">
                    <label class="cart-item__select">
                        <input
                            type="checkbox"
                            data-cart-select="${escapeHTML(item.id)}"
                            ${checked ? "checked" : ""}
                            aria-label="Select ${escapeHTML(item.name)}"
                        >
                    </label>

                    <a class="cart-item__image" href="product.html?id=${encodeURIComponent(item.id)}">
                        <img src="${escapeHTML(item.image || "")}" alt="${escapeHTML(item.name || "Component")}" loading="lazy">
                    </a>

                    <div class="cart-item__content">
                        <span class="cart-item__category">${escapeHTML((item.category || "Components").toUpperCase())}</span>
                        <a class="cart-item__name" href="product.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.name || "Component")}</a>
                        <div class="cart-item__actions">
                            <div class="cart-item__quantity" data-cart-qty="${escapeHTML(item.id)}">
                                <button type="button" data-cart-qty-minus="${escapeHTML(item.id)}" aria-label="Decrease quantity">−</button>
                                <span class="cart-item__quantity-value">${quantity}</span>
                                <button type="button" data-cart-qty-plus="${escapeHTML(item.id)}" aria-label="Increase quantity">+</button>
                            </div>
                            <button type="button" class="cart-item__remove" data-cart-remove="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(item.name)}">Remove</button>
                        </div>
                    </div>

                    <div class="cart-item__price-wrap">
                        <strong class="cart-item__price">${formatPrice(lineTotal)}</strong>
                        <span class="cart-item__unit">${formatPrice(unit)} each</span>
                    </div>
                </article>
            `;
        }).join("");
    }

    const selectedItems = cart.filter(item => selectedCartIds.has(item.id));
    updateCartSummary(selectedItems.length ? selectedItems : cart);
    updateSelectAllState(cart);
    updateWhatsAppButtonState(selectedItems);
}

function updateSelectAllState(cart) {
    const selectAll = document.querySelector("[data-cart-select-all]");
    if (!selectAll) return;

    const allSelected = cart.length > 0 && cart.every(item => selectedCartIds.has(item.id));
    selectAll.checked = allSelected;
    selectAll.indeterminate = !allSelected && selectedCartIds.size > 0;
}

function updateCartSummary(items) {
    const subtotal = items.reduce((sum, item) => {
        return sum + (Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1);
    }, 0);

    const subtotalEl = document.querySelector("[data-cart-subtotal]");
    const totalEl = document.querySelector("[data-cart-total]");
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (totalEl) totalEl.textContent = formatPrice(subtotal);
}

function updateWhatsAppButtonState(selectedItems) {
    const button = document.querySelector("[data-cart-whatsapp]");
    const hint = document.querySelector("[data-cart-whatsapp-hint]");
    const disabled = !selectedItems.length;

    if (button) {
        button.disabled = disabled;
        button.classList.toggle("is-disabled", disabled);
        button.setAttribute("aria-disabled", disabled ? "true" : "false");
    }

    if (hint) {
        hint.textContent = disabled
            ? "Please select at least one item to order."
            : `${selectedItems.length} selected · ready to order on WhatsApp`;
    }
}

function handleCartItemsClick(event) {
    const remove = event.target.closest("[data-cart-remove]");
    if (remove) {
        const id = remove.getAttribute("data-cart-remove");
        selectedCartIds.delete(id);
        removeFromCart(id);
        renderCartPage();
        showToast("Item removed from cart.", "success");
        return;
    }

    const minus = event.target.closest("[data-cart-qty-minus]");
    if (minus) {
        const id = minus.getAttribute("data-cart-qty-minus");
        const item = getCart().find(entry => entry.id === id);
        if (!item) return;
        updateCartQuantity(id, Math.max(1, Number(item.quantity || 1) - 1));
        renderCartPage();
        return;
    }

    const plus = event.target.closest("[data-cart-qty-plus]");
    if (plus) {
        const id = plus.getAttribute("data-cart-qty-plus");
        const item = getCart().find(entry => entry.id === id);
        if (!item) return;
        updateCartQuantity(id, Number(item.quantity || 1) + 1);
        renderCartPage();
    }
}

function handleCartItemsChange(event) {
    const checkbox = event.target.closest("[data-cart-select]");
    if (!checkbox) return;

    const id = checkbox.getAttribute("data-cart-select");
    if (checkbox.checked) {
        selectedCartIds.add(id);
    } else {
        selectedCartIds.delete(id);
    }

    const cart = getCart();
    const selectedItems = cart.filter(item => selectedCartIds.has(item.id));
    updateSelectAllState(cart);
    updateCartSummary(selectedItems.length ? selectedItems : cart);
    updateWhatsAppButtonState(selectedItems);
}

function orderSelectedOnWhatsApp() {
    const cart = getCart();
    const selectedItems = cart.filter(item => selectedCartIds.has(item.id));

    if (!selectedItems.length) {
        showToast("Please select at least one item to order.", "error");
        return;
    }

    try {
        const message = buildSelectedCartWhatsAppMessage(selectedItems);
        openWhatsAppOrder(message);
    } catch (error) {
        console.error("Cart WhatsApp order error:", error);
        showToast(error.message || "Unable to open WhatsApp.", "error");
    }
}
