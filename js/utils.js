/* =========================================================
   PROJECTKART
   Utility Functions
   ========================================================= */


/*
|--------------------------------------------------------------------------
| Currency
|--------------------------------------------------------------------------
*/

export function formatPrice(
    value
) {

    const amount =
        Number(value || 0);


    return new Intl.NumberFormat(
        "en-IN",
        {
            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                0
        }
    ).format(amount);
}


/*
|--------------------------------------------------------------------------
| Escape HTML
|--------------------------------------------------------------------------
|
| Important because product information comes from Firestore.
|
*/

export function escapeHTML(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/*
|--------------------------------------------------------------------------
| Create Slug
|--------------------------------------------------------------------------
*/

export function createSlug(
    value
) {

    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9\s-]/g,
            ""
        )
        .replace(
            /\s+/g,
            "-"
        )
        .replace(
            /-+/g,
            "-"
        );
}


/*
|--------------------------------------------------------------------------
| Get URL Parameter
|--------------------------------------------------------------------------
*/

export function getQueryParam(
    name
) {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return params.get(name);
}


/*
|--------------------------------------------------------------------------
| Show Element
|--------------------------------------------------------------------------
*/

export function show(
    element
) {

    if (!element) {
        return;
    }


    element.classList.remove(
        "hidden"
    );
}


/*
|--------------------------------------------------------------------------
| Hide Element
|--------------------------------------------------------------------------
*/

export function hide(
    element
) {

    if (!element) {
        return;
    }


    element.classList.add(
        "hidden"
    );
}


/*
|--------------------------------------------------------------------------
| Debounce
|--------------------------------------------------------------------------
*/

export function debounce(
    callback,
    delay = 300
) {

    let timeout;


    return function (...args) {

        clearTimeout(timeout);


        timeout =
            setTimeout(
                () => {
                    callback(...args);
                },
                delay
            );
    };
}


/*
|--------------------------------------------------------------------------
| Toast
|--------------------------------------------------------------------------
*/

export function showToast(
    message,
    type = "default"
) {

    let container =
        document.querySelector(
            "#toast-container"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "toast-container";

        container.style.position =
            "fixed";

        container.style.right =
            "24px";

        container.style.bottom =
            "24px";

        container.style.zIndex =
            "9999";

        container.style.display =
            "flex";

        container.style.flexDirection =
            "column";

        container.style.gap =
            "10px";

        document.body.appendChild(
            container
        );
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.textContent =
        message;


    toast.style.padding =
        "14px 18px";

    toast.style.border =
        "1px solid rgba(255,255,255,.1)";

    toast.style.borderRadius =
        "12px";

    toast.style.background =
        "#151a26";

    toast.style.color =
        "#ffffff";

    toast.style.fontSize =
        "14px";

    toast.style.boxShadow =
        "0 20px 50px rgba(0,0,0,.35)";


    if (type === "success") {

        toast.style.borderColor =
            "rgba(0,214,143,.35)";
    }


    if (type === "error") {

        toast.style.borderColor =
            "rgba(255,93,104,.35)";
    }


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(8px)";

            toast.style.transition =
                "250ms ease";


            setTimeout(
                () => {
                    toast.remove();
                },
                250
            );

        },
        3000
    );
}


/*
|--------------------------------------------------------------------------
| Loading State
|--------------------------------------------------------------------------
*/

export function setLoading(
    button,
    loading,
    loadingText = "Loading..."
) {

    if (!button) {
        return;
    }


    if (loading) {

        button.dataset.originalText =
            button.innerHTML;

        button.innerHTML =
            loadingText;

        button.disabled =
            true;

        button.style.opacity =
            "0.7";

        button.style.cursor =
            "wait";

    } else {

        button.innerHTML =
            button.dataset.originalText || "Submit";

        button.disabled =
            false;

        button.style.opacity =
            "";

        button.style.cursor =
            "";
    }
}