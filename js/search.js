/* =========================================================
   PROJECTKART
   Search
   ========================================================= */

   import {
    searchProducts
} from "./products.js";

import {
    escapeHTML,
    formatPrice
} from "./utils.js";


let searchTimeout =
    null;


/*
|--------------------------------------------------------------------------
| Initialize Search
|--------------------------------------------------------------------------
*/

export function initSearch() {

    const inputs =
        document.querySelectorAll(
            "[data-product-search]"
        );


    inputs.forEach(
        input => {

            input.addEventListener(
                "input",
                handleSearchInput
            );

            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        runSearch(
                            input.value
                        );
                    }
                }
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Handle Search Input
|--------------------------------------------------------------------------
*/

function handleSearchInput(
    event
) {

    const input =
        event.currentTarget;


    clearTimeout(
        searchTimeout
    );


    searchTimeout =
        setTimeout(
            () => {

                showSearchSuggestions(
                    input
                );

            },
            250
        );
}


/*
|--------------------------------------------------------------------------
| Run Search
|--------------------------------------------------------------------------
*/

export function runSearch(
    term
) {

    const value =
        String(
            term || ""
        ).trim();


    if (!value) {
        return;
    }


    window.location.href =
        `shop.html?search=${encodeURIComponent(value)}`;
}


/*
|--------------------------------------------------------------------------
| Search Suggestions
|--------------------------------------------------------------------------
*/

async function showSearchSuggestions(
    input
) {

    const term =
        input.value.trim();


    const container =
        input.parentElement?.querySelector(
            "[data-search-results]"
        );


    if (!container) {
        return;
    }


    if (!term) {

        container.innerHTML =
            "";

        container.classList.add(
            "hidden"
        );

        return;
    }


    try {

        const products =
            await searchProducts(
                term
            );


        const results =
            products.slice(
                0,
                5
            );


        if (!results.length) {

            container.innerHTML = `
                <div class="search-empty">
                    No products found
                </div>
            `;

            container.classList.remove(
                "hidden"
            );

            return;
        }


        container.innerHTML =
            results.map(
                product => `

                    <a
                        class="search-result"
                        href="product.html?id=${encodeURIComponent(product.id)}"
                    >

                        <div class="search-result-image">

                            <img
                                src="${escapeHTML(product.image || "assets/images/placeholders/product.png")}"
                                alt="${escapeHTML(product.name)}"
                            >

                        </div>


                        <div class="search-result-info">

                            <strong>
                                ${escapeHTML(product.name)}
                            </strong>

                            <span>
                                ${formatPrice(product.price)}
                            </span>

                        </div>

                    </a>

                `
            ).join("");


        container.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Search error:",
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| Close Search Suggestions
|--------------------------------------------------------------------------
*/

export function closeSearchSuggestions() {

    document
        .querySelectorAll(
            "[data-search-results]"
        )
        .forEach(
            container => {

                container.classList.add(
                    "hidden"
                );
            }
        );
}


document.addEventListener("DOMContentLoaded", () => {
    initSearch();
});