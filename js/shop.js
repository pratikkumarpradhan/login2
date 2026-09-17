/* =========================================================
   PROJECTKART
   Shop Page
   ========================================================= */

   import {
    getProducts,
    searchProducts
} from "./products.js";

import {
    getCategories
} from "./categories.js";

import {
    escapeHTML,
    formatPrice,
    getQueryParam
} from "./utils.js";


let allProducts = [];


/*
|--------------------------------------------------------------------------
| Initialize Shop
|--------------------------------------------------------------------------
*/

export async function initShop() {

    const grid =
        document.querySelector(
            "[data-shop-products]"
        );


    if (!grid) {
        return;
    }


    try {

        allProducts =
            await getProducts();


        await loadFilters();

        setupSearch();

        setupSorting();

        setupCategoryFilter();

        renderProducts(
            allProducts
        );


        /*
        |--------------------------------------------------------------------------
        | URL Search
        |--------------------------------------------------------------------------
        */

        const search =
            getQueryParam(
                "search"
            );


        if (search) {

            const results =
                await searchProducts(
                    search
                );


            renderProducts(
                results
            );


            const searchInput =
                document.querySelector(
                    "[data-shop-search]"
                );


            if (searchInput) {
                searchInput.value =
                    search;
            }
        }


    } catch (error) {

        console.error(
            "Shop initialization error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                Unable to load products.
            </div>
        `;
    }
}


/*
|--------------------------------------------------------------------------
| Load Category Filter
|--------------------------------------------------------------------------
*/

async function loadFilters() {

    const container =
        document.querySelector(
            "[data-category-filter]"
        );


    if (!container) {
        return;
    }


    const categories =
        await getCategories();


    container.innerHTML = `

        <button
            type="button"
            class="filter-option is-active"
            data-category=""
        >
            All Products
        </button>

        ${
            categories.map(
                category => `

                    <button
                        type="button"
                        class="filter-option"
                        data-category="${escapeHTML(category.id)}"
                    >
                        ${escapeHTML(category.name)}
                    </button>

                `
            ).join("")
        }

    `;
}


/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
*/

function setupSearch() {

    const input =
        document.querySelector(
            "[data-shop-search]"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            const term =
                input.value
                    .toLowerCase()
                    .trim();


            const results =
                !term
                ?
                allProducts
                :
                allProducts.filter(
                    product => {

                        const searchable = `

                            ${product.name || ""}

                            ${product.description || ""}

                            ${product.categoryName || ""}

                        `.toLowerCase();


                        return searchable.includes(
                            term
                        );
                    }
                );


            renderProducts(
                results
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Category Filter
|--------------------------------------------------------------------------
*/

function setupCategoryFilter() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-category]"
                );


            if (!button) {
                return;
            }


            const categoryId =
                button.dataset.category;


            document
                .querySelectorAll(
                    "[data-category]"
                )
                .forEach(
                    item => {

                        item.classList.toggle(
                            "is-active",
                            item === button
                        );
                    }
                );


            if (!categoryId) {

                renderProducts(
                    allProducts
                );

                return;
            }


            renderProducts(

                allProducts.filter(
                    product =>
                        product.categoryId ===
                        categoryId
                )
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Sorting
|--------------------------------------------------------------------------
*/

function setupSorting() {

    const select =
        document.querySelector(
            "[data-shop-sort]"
        );


    if (!select) {
        return;
    }


    select.addEventListener(
        "change",
        () => {

            const products =
                [
                    ...allProducts
                ];


            switch (
                select.value
            ) {

                case "price-low":

                    products.sort(
                        (
                            a,
                            b
                        ) =>
                            Number(a.price) -
                            Number(b.price)
                    );

                    break;


                case "price-high":

                    products.sort(
                        (
                            a,
                            b
                        ) =>
                            Number(b.price) -
                            Number(a.price)
                    );

                    break;


                case "name":

                    products.sort(
                        (
                            a,
                            b
                        ) =>
                            String(a.name)
                                .localeCompare(
                                    String(b.name)
                                )
                    );

                    break;


                default:

                    break;
            }


            renderProducts(
                products
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Render Products
|--------------------------------------------------------------------------
*/

function renderProducts(
    products
) {

    const grid =
        document.querySelector(
            "[data-shop-products]"
        );


    const count =
        document.querySelector(
            "[data-product-count]"
        );


    if (!grid) {
        return;
    }


    if (count) {

        count.textContent =
            `${products.length} products`;
    }


    if (!products.length) {

        grid.innerHTML = `

            <div class="empty-state">

                <h3>
                    No products found
                </h3>

                <p>
                    Try changing your search or filters.
                </p>

            </div>

        `;

        return;
    }


    grid.innerHTML =
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