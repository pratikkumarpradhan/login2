/* =========================================================
   PROJECTKART
   Category Page
   ========================================================= */

   import {
    getCategory
} from "./categories.js";

import {
    getProductsByCategory
} from "./products.js";

import {
    escapeHTML,
    formatPrice,
    getQueryParam
} from "./utils.js";


/*
|--------------------------------------------------------------------------
| Initialize Category Page
|--------------------------------------------------------------------------
*/

export async function initCategoryPage() {

    const categoryId =
        getQueryParam(
            "id"
        );


    if (!categoryId) {

        showCategoryNotFound();

        return;
    }


    try {

        const [
            category,
            products
        ] =
            await Promise.all([

                getCategory(
                    categoryId
                ),

                getProductsByCategory(
                    categoryId
                )

            ]);


        if (!category) {

            showCategoryNotFound();

            return;
        }


        renderCategoryHeader(
            category
        );


        renderProducts(
            products
        );


    } catch (error) {

        console.error(
            "Category page error:",
            error
        );


        showCategoryNotFound();
    }
}


/*
|--------------------------------------------------------------------------
| Category Header
|--------------------------------------------------------------------------
*/

function renderCategoryHeader(
    category
) {

    const container =
        document.querySelector(
            "[data-category-header]"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="category-page-header">

            <div class="category-page-header-image">

                ${
                    category.image
                    ?
                    `
                    <img
                        src="${escapeHTML(category.image)}"
                        alt="${escapeHTML(category.name)}"
                    >
                    `
                    :
                    ""
                }

            </div>


            <div class="category-page-header-content">

                <span class="eyebrow">
                    Category
                </span>


                <h1>
                    ${escapeHTML(category.name)}
                </h1>


                ${
                    category.description
                    ?
                    `
                    <p>
                        ${escapeHTML(category.description)}
                    </p>
                    `
                    :
                    ""
                }

            </div>

        </div>

    `;
}


/*
|--------------------------------------------------------------------------
| Product Grid
|--------------------------------------------------------------------------
*/

function renderProducts(
    products
) {

    const container =
        document.querySelector(
            "[data-category-products]"
        );


    if (!container) {
        return;
    }


    if (!products.length) {

        container.innerHTML = `

            <div class="empty-state">

                <h3>
                    No products available
                </h3>

                <p>
                    Products will appear here when they are added.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =
        products.map(
            product => `

                <article
                    class="product-card"
                >

                    <a
                        class="product-card-image"
                        href="product.html?id=${encodeURIComponent(product.id)}"
                    >

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
                            loading="lazy"
                        >

                    </a>


                    <div class="product-card-content">

                        <span class="product-category">
                            ${escapeHTML(product.categoryName || "Components")}
                        </span>


                        <h3 class="product-name">

                            <a
                                href="product.html?id=${encodeURIComponent(product.id)}"
                            >
                                ${escapeHTML(product.name)}
                            </a>

                        </h3>


                        <div class="product-card-bottom">

                            <div class="product-price">

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


                            <a
                                class="product-card-arrow"
                                href="product.html?id=${encodeURIComponent(product.id)}"
                            >
                                →
                            </a>

                        </div>

                    </div>

                </article>

            `
        )
        .join("");
}


/*
|--------------------------------------------------------------------------
| Category Not Found
|--------------------------------------------------------------------------
*/

function showCategoryNotFound() {

    const header =
        document.querySelector(
            "[data-category-header]"
        );


    const products =
        document.querySelector(
            "[data-category-products]"
        );


    if (header) {

        header.innerHTML = `

            <div class="empty-state">

                <h1>
                    Category not found
                </h1>

                <p>
                    This category may have been removed.
                </p>

                <a
                    href="categories.html"
                    class="btn btn-primary"
                >
                    Browse Categories
                </a>

            </div>

        `;
    }


    if (products) {
        products.innerHTML = "";
    }
}