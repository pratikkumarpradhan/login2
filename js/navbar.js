/* =========================================================
   PROJECTKART
   Navbar
   ========================================================= */

   import {
    watchUser,
    logoutUser
} from "./auth.js";

import {
    initCart,
    updateCartCount
} from "./cart.js";


/*
|--------------------------------------------------------------------------
| Initialize Navbar
|--------------------------------------------------------------------------
*/

export function initNavbar() {

    initCart();

    setupMobileMenu();

    setupAccountMenu();

    setupLogout();

    setupAuthState();

    updateCartCount();
}


/*
|--------------------------------------------------------------------------
| Mobile Menu
|--------------------------------------------------------------------------
*/

function setupMobileMenu() {

    const button =
        document.querySelector(
            "[data-mobile-menu-button]"
        );


    const menu =
        document.querySelector(
            "[data-mobile-menu]"
        );


    if (!button || !menu) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            const isOpen =
                menu.classList.toggle(
                    "is-open"
                );


            button.classList.toggle(
                "is-open",
                isOpen
            );


            document.body.classList.toggle(
                "no-scroll",
                isOpen
            );
        }
    );


    menu.querySelectorAll("a")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        menu.classList.remove(
                            "is-open"
                        );

                        button.classList.remove(
                            "is-open"
                        );

                        document.body.classList.remove(
                            "no-scroll"
                        );
                    }
                );
            }
        );
}


/*
|--------------------------------------------------------------------------
| Account Dropdown
|--------------------------------------------------------------------------
*/

function setupAccountMenu() {

    const button =
        document.querySelector(
            "[data-account-button]"
        );


    const menu =
        document.querySelector(
            "[data-account-menu]"
        );


    if (!button || !menu) {
        return;
    }


    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            menu.classList.toggle(
                "is-open"
            );
        }
    );


    document.addEventListener(
        "click",
        () => {

            menu.classList.remove(
                "is-open"
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

function setupLogout() {

    document
        .querySelectorAll(
            "[data-logout]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();


                        try {

                            await logoutUser();

                        } catch (error) {

                            console.error(
                                "Logout failed:",
                                error
                            );
                        }
                    }
                );
            }
        );
}


/*
|--------------------------------------------------------------------------
| Authentication State
|--------------------------------------------------------------------------
*/

function setupAuthState() {

    watchUser(
        user => {

            const loggedOutElements =
                document.querySelectorAll(
                    "[data-auth-logged-out]"
                );


            const loggedInElements =
                document.querySelectorAll(
                    "[data-auth-logged-in]"
                );


            loggedOutElements.forEach(
                element => {

                    element.classList.toggle(
                        "hidden",
                        Boolean(user)
                    );
                }
            );


            loggedInElements.forEach(
                element => {

                    element.classList.toggle(
                        "hidden",
                        !user
                    );
                }
            );


            document
                .querySelectorAll(
                    "[data-user-name]"
                )
                .forEach(
                    element => {

                        element.textContent =
                            user?.displayName
                            ||
                            user?.email
                            ||
                            "Account";
                    }
                );
        }
    );
}