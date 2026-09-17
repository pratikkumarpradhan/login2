/* =========================================================
   PROJECTKART
   Homepage
   ========================================================= */

   import {
    getProducts,
    getFeaturedProducts
} from "./products.js";

import {
    getCategories
} from "./categories.js";

import {
    getFeaturedKits
} from "./kits.js";

import {
    escapeHTML,
    formatPrice
} from "./utils.js";


/*
|--------------------------------------------------------------------------
| Initialize Homepage
|--------------------------------------------------------------------------
*/

export async function initHome() {

    await Promise.allSettled([

        loadCategories(),

        loadFeaturedProducts(),

        loadPopularProducts(),

        loadFeaturedKits()

    ]);
}


/*
|--------------------------------------------------------------------------
| Category Cards
|--------------------------------------------------------------------------
*/

async function loadCategories() {

    const container =
        document.querySelector(
            "[data-home-categories]"
        );


    if (!container) {
        return;
    }


    try {

        const categories =
            await getCategories();


        container.innerHTML =
            categories
                .slice(
                    0,
                    8
                )
                .map(
                    category => `

                        <a
                            class="category-card"
                            href="category.html?id=${encodeURIComponent(category.id)}"
                        >

                            <div class="category-card-image">

                                <img
                                    src="${escapeHTML(category.image || "assets/images/placeholders/category.png")}"
                                    alt="${escapeHTML(category.name)}"
                                    loading="lazy"
                                >

                            </div>


                            <div class="category-card-content">

                                <h3>
                                    ${escapeHTML(category.name)}
                                </h3>

                                <span>
                                    Explore
                                    <span aria-hidden="true">→</span>
                                </span>

                            </div>

                        </a>

                    `
                )
                .join("");


    } catch (error) {

        console.error(
            "Unable to load categories:",
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| Featured Products
|--------------------------------------------------------------------------
*/

async function loadFeaturedProducts() {

    const container =
        document.querySelector(
            "[data-featured-products]"
        );


    if (!container) {
        return;
    }


    try {

        const products =
            await getFeaturedProducts(
                8
            );


        renderProducts(
            container,
            products
        );


    } catch (error) {

        console.error(
            "Unable to load featured products:",
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| Popular Products
|--------------------------------------------------------------------------
*/

async function loadPopularProducts() {

    const container =
        document.querySelector(
            "[data-popular-products]"
        );


    if (!container) {
        return;
    }


    try {

        const products =
            await getProducts();


        renderProducts(

            container,

            products.slice(
                0,
                8
            )
        );


    } catch (error) {

        console.error(
            "Unable to load popular products:",
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| Project Kits
|--------------------------------------------------------------------------
*/

async function loadFeaturedKits() {

    const container =
        document.querySelector(
            "[data-featured-kits]"
        );


    if (!container) {
        return;
    }


    try {

        const kits =
            await getFeaturedKits(
                6
            );


        container.innerHTML =
            kits.map(
                kit => `

                    <a
                        class="kit-card"
                        href="project-kits.html"
                    >

                        <div class="kit-card-image">

                            <img
                                src="${escapeHTML(kit.image || "assets/images/placeholders/kit.png")}"
                                alt="${escapeHTML(kit.name)}"
                                loading="lazy"
                            >

                        </div>


                        <div class="kit-card-content">

                            <span class="kit-card-difficulty">
                                ${escapeHTML(kit.difficulty || "Beginner")}
                            </span>

                            <h3>
                                ${escapeHTML(kit.name)}
                            </h3>

                            <p>
                                ${escapeHTML(kit.description || "")}
                            </p>

                            <strong>
                                ${formatPrice(kit.price)}
                            </strong>

                        </div>

                    </a>

                `
            ).join("");


    } catch (error) {

        console.error(
            "Unable to load kits:",
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| Product Renderer
|--------------------------------------------------------------------------
*/

function renderProducts(
    container,
    products
) {

    if (!products.length) {

        container.innerHTML = `
            <div class="empty-state">
                No products available right now.
            </div>
        `;

        return;
    }


    container.innerHTML =
        products.map(
            product => `

                <article
                    class="product-card"
                    data-product-id="${escapeHTML(product.id)}"
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
                                aria-label="View ${escapeHTML(product.name)}"
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