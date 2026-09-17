/* =========================================================
   PROJECTKART
   Product Details Page
   ========================================================= */

   import {
    getProduct,
    getProductsByCategory
} from "./products.js";

import {
    addToCart
} from "./cart.js";

import {
    getQueryParam,
    escapeHTML,
    formatPrice,
    showToast
} from "./utils.js";


/*
|--------------------------------------------------------------------------
| Initialize Product Page
|--------------------------------------------------------------------------
*/

export async function initProductPage() {

    const productId =
        getQueryParam(
            "id"
        );


    if (!productId) {

        showNotFound();

        return;
    }


    try {

        const product =
            await getProduct(
                productId
            );


        if (!product || product.active === false) {

            showNotFound();

            return;
        }


        renderProduct(
            product
        );


        loadRelatedProducts(
            product
        );


    } catch (error) {

        console.error(
            "Product loading error:",
            error
        );

        showNotFound();
    }
}


/*
|--------------------------------------------------------------------------
| Render Product
|--------------------------------------------------------------------------
*/

function renderProduct(
    product
) {

    const container =
        document.querySelector(
            "[data-product-page]"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="product-detail">

            <div class="product-detail-gallery">

                <div class="product-detail-main-image">

                    ${
                        product.badge
                        ?
                        `
                        <span class="product-badge">
                            ${escapeHTML(product.badge)}
                        </span>
                        `
                        :
                        ""
                    }

                    <img
                        src="${escapeHTML(product.image || "assets/images/placeholders/product.png")}"
                        alt="${escapeHTML(product.name)}"
                        data-product-main-image
                    >

                </div>

            </div>


            <div class="product-detail-info">

                <span class="product-detail-category">
                    ${escapeHTML(product.categoryName || "Components")}
                </span>


                <h1>
                    ${escapeHTML(product.name)}
                </h1>


                <div class="product-detail-price">

                    <strong>
                        ${formatPrice(product.price)}
                    </strong>

                    ${
                        Number(product.oldPrice) > Number(product.price)
                        ?
                        `
                        <del>
                            ${formatPrice(product.oldPrice)}
                        </del>
                        `
                        :
                        ""
                    }

                </div>


                <div class="product-stock">

                    ${
                        Number(product.stock) > 0
                        ?
                        `
                        <span class="stock-dot"></span>
                        In stock
                        `
                        :
                        `
                        <span class="stock-dot out"></span>
                        Out of stock
                        `
                    }

                </div>


                <div class="product-description">

                    ${escapeHTML(product.description || "No description available.")}

                </div>


                ${
                    Number(product.stock) > 0
                    ?
                    `
                    <div class="product-purchase">

                        <div class="quantity-control">

                            <button
                                type="button"
                                data-quantity-minus
                            >
                                −
                            </button>

                            <input
                                type="number"
                                value="1"
                                min="1"
                                max="${Number(product.stock)}"
                                data-product-quantity
                            >

                            <button
                                type="button"
                                data-quantity-plus
                            >
                                +
                            </button>

                        </div>


                        <button
                            type="button"
                            class="btn btn-primary btn-large"
                            data-add-product
                        >
                            Add to Cart
                        </button>

                    </div>
                    `
                    :
                    `
                    <button
                        type="button"
                        class="btn btn-disabled btn-large"
                        disabled
                    >
                        Out of Stock
                    </button>
                    `
                }

            </div>

        </div>

    `;


    setupQuantity(
        product
    );


    setupAddToCart(
        product
    );
}


/*
|--------------------------------------------------------------------------
| Quantity
|--------------------------------------------------------------------------
*/

function setupQuantity(
    product
) {

    const input =
        document.querySelector(
            "[data-product-quantity]"
        );


    const minus =
        document.querySelector(
            "[data-quantity-minus]"
        );


    const plus =
        document.querySelector(
            "[data-quantity-plus]"
        );


    if (!input) {
        return;
    }


    const max =
        Number(
            product.stock
        );


    minus?.addEventListener(
        "click",
        () => {

            const current =
                Number(
                    input.value
                );


            input.value =
                Math.max(
                    1,
                    current - 1
                );
        }
    );


    plus?.addEventListener(
        "click",
        () => {

            const current =
                Number(
                    input.value
                );


            input.value =
                Math.min(
                    max,
                    current + 1
                );
        }
    );


    input.addEventListener(
        "change",
        () => {

            let value =
                Number(
                    input.value
                );


            if (!Number.isFinite(value)) {
                value = 1;
            }


            value =
                Math.max(
                    1,
                    Math.min(
                        max,
                        value
                    )
                );


            input.value =
                value;
        }
    );
}


/*
|--------------------------------------------------------------------------
| Add To Cart
|--------------------------------------------------------------------------
*/

function setupAddToCart(
    product
) {

    const button =
        document.querySelector(
            "[data-add-product]"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            const input =
                document.querySelector(
                    "[data-product-quantity]"
                );


            const quantity =
                Number(
                    input?.value || 1
                );


            try {

                addToCart(
                    product,
                    quantity
                );


                showToast(
                    "Product added to cart.",
                    "success"
                );


            } catch (error) {

                showToast(
                    error.message,
                    "error"
                );
            }
        }
    );
}


/*
|--------------------------------------------------------------------------
| Related Products
|--------------------------------------------------------------------------
*/

async function loadRelatedProducts(
    product
) {

    const container =
        document.querySelector(
            "[data-related-products]"
        );


    if (
        !container
        ||
        !product.categoryId
    ) {

        return;
    }


    try {

        const products =
            await getProductsByCategory(
                product.categoryId
            );


        const related =
            products
                .filter(
                    item =>
                        item.id !==
                        product.id
                )
                .slice(
                    0,
                    4
                );


        if (!related.length) {
            return;
        }


        container.innerHTML =
            related.map(
                item => `

                    <article
                        class="product-card"
                    >

                        <a
                            class="product-card-image"
                            href="product.html?id=${encodeURIComponent(item.id)}"
                        >

                            <img
                                src="${escapeHTML(item.image || "assets/images/placeholders/product.png")}"
                                alt="${escapeHTML(item.name)}"
                                loading="lazy"
                            >

                        </a>


                        <div class="product-card-content">

                            <span class="product-category">
                                ${escapeHTML(item.categoryName || "Components")}
                            </span>


                            <h3 class="product-name">

                                <a
                                    href="product.html?id=${encodeURIComponent(item.id)}"
                                >
                                    ${escapeHTML(item.name)}
                                </a>

                            </h3>


                            <strong class="product-price-single">
                                ${formatPrice(item.price)}
                            </strong>

                        </div>

                    </article>

                `
            ).join("");


    } catch (error) {

        console.error(
            "Unable to load related products:",
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| Not Found
|--------------------------------------------------------------------------
*/

function showNotFound() {

    const container =
        document.querySelector(
            "[data-product-page]"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="empty-state product-not-found">

            <h1>
                Product not found
            </h1>

            <p>
                This product may have been removed or is no longer available.
            </p>

            <a
                href="shop.html"
                class="btn btn-primary"
            >
                Browse Products
            </a>

        </div>

    `;
}