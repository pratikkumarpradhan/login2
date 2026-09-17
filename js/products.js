/* =========================================================
   PROJECTKART
   Product Database — thin compatibility layer
   Public catalogue lives in Firestore collection: components
   ========================================================= */

export {
    COMPONENTS_COLLECTION,
    getComponents,
    getProducts,
    watchActiveComponents,
    watchFeaturedComponents,
    getFeaturedProducts,
    getComponent,
    getProduct,
    getComponentsByCategory,
    getProductsByCategory,
    searchProducts,
    getAllComponents,
    getAllProducts,
    addComponent,
    addProduct,
    updateComponent,
    updateProduct,
    deleteComponent,
    deleteProduct,
    setComponentActive,
    setProductActive,
    setComponentFeatured,
    setProductFeatured
} from "./components.js";
