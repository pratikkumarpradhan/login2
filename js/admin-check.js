/* =========================================================
   PROJECTKART
   Shared admin authorization (no DOM side effects)
   ========================================================= */

import {
    doc,
    getDoc
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    getUser
} from "./user.js";

/**
 * Admin if either:
 * - Users/{uid}.role === "admin" (and not disabled)
 * - OR document exists at admins/{uid}
 */
export async function isCurrentUserAdmin(user = auth.currentUser) {
    if (!user?.uid) {
        return false;
    }

    let roleAdmin = false;
    let recordAdmin = false;

    try {
        const profile = await getUser(user.uid);
        const role = String(profile?.role || "").trim().toLowerCase();
        const status = String(profile?.accountStatus || "active").trim().toLowerCase();
        roleAdmin = role === "admin" && status !== "disabled" && status !== "inactive";
    } catch (error) {
        console.error("Admin profile check error:", error);
    }

    try {
        const adminSnapshot = await getDoc(doc(db, "admins", user.uid));
        recordAdmin = adminSnapshot.exists();
    } catch (error) {
        if (error?.code !== "permission-denied") {
            console.error("Admin record check error:", error);
        }
    }

    const allowed = roleAdmin || recordAdmin;

    console.info("[ProjectKart] admin check", {
        uid: user.uid,
        email: user.email || null,
        roleAdmin,
        recordAdmin,
        allowed
    });

    return allowed;
}
