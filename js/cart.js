/* =========================================================
   PROJECTKART
   Shopping Cart
   ========================================================= */

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
           "[data-cart-count]"
       );


   elements.forEach(
       element => {

           element.textContent =
               count;

           element.classList.toggle(
               "hidden",
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