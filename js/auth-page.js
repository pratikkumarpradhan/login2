document.addEventListener("DOMContentLoaded", () => {
    const header = document.getElementById("siteHeader");
    const scrollTop = document.getElementById("scrollTopButton");
    const form = document.getElementById("navbarSearch");
    const input = document.getElementById("globalSearchInput");

    const onScroll = () => {
        header?.classList.toggle("is-scrolled", window.scrollY > 12);
        scrollTop?.classList.toggle("is-visible", window.scrollY > 480);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    form?.addEventListener("submit", event => {
        event.preventDefault();
        const query = input?.value.trim();
        window.location.href = query
            ? `shop.html?search=${encodeURIComponent(query)}`
            : "shop.html";
    });
});
