/* =========================================================
   PROJECTKART
   Authentication: login, register, logout, reset, listener
   ========================================================= */

import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth
} from "./firebase.js";

import {
    collectDeviceToken,
    createUserProfile,
    getUser,
    syncSessionProfile
} from "./user.js";

let authResolved = false;
let currentAuthUser = null;
const authReadyWaiters = [];

function resolveAuthReady(user) {
    currentAuthUser = user || null;
    authResolved = true;
    while (authReadyWaiters.length) {
        authReadyWaiters.shift()(currentAuthUser);
    }
}

onAuthStateChanged(auth, user => {
    resolveAuthReady(user);
});

export function whenAuthReady() {
    if (authResolved) {
        return Promise.resolve(currentAuthUser);
    }

    return new Promise(resolve => {
        authReadyWaiters.push(resolve);
    });
}

export function getAuthErrorMessage(error, fallback = "Something went wrong. Please try again.") {
    const code = error?.code || "";

    switch (code) {
        case "auth/email-already-in-use":
            return "An account with this email already exists.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/weak-password":
            return "Please choose a stronger password.";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Incorrect email or password.";
        case "auth/user-disabled":
            return "This account has been disabled.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        case "auth/network-request-failed":
            return "Network error. Please check your connection.";
        case "auth/missing-email":
            return "Please enter your email address.";
        case "auth/operation-not-allowed":
            return "Email sign-in is currently unavailable.";
        default:
            return error?.message && !String(error.message).includes("Firebase")
                ? error.message
                : fallback;
    }
}

export async function registerUser(formData) {
    const firstName = String(formData.firstName || "").trim();
    const lastName = String(formData.lastName || "").trim();
    const email = String(formData.email || "").trim().toLowerCase();
    const password = String(formData.password || "");
    const displayName = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName || !email || !password) {
        throw new Error("Please fill in all required fields.");
    }

    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    const user = credentials.user;
    const deviceToken = await collectDeviceToken();

    if (displayName) {
        try {
            await updateProfile(user, { displayName });
        } catch (error) {
            console.error("Auth profile update error:", error);
        }
    }

    await createUserProfile(user, {
        ...formData,
        firstName,
        lastName,
        displayName,
        email,
        deviceToken,
        role: "user"
    });

    try {
        await sendEmailVerification(user);
    } catch (error) {
        console.error("Verification email error:", error);
    }

    return {
        user,
        profile: await getUser(user.uid)
    };
}

export async function loginUser(email, password) {
    if (!email || !password) {
        throw new Error("Email and password are required.");
    }

    const credentials = await signInWithEmailAndPassword(
        auth,
        String(email).trim(),
        password
    );

    const profile = await syncSessionProfile(credentials.user);
    return {
        user: credentials.user,
        profile
    };
}

export async function logoutUser() {
    await signOut(auth);
}

export async function resetPassword(email) {
    const value = String(email || "").trim();

    if (!value) {
        throw new Error("Please enter your email address.");
    }

    await sendPasswordResetEmail(auth, value);
    return true;
}

export function watchUser(callback) {
    return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
    return auth.currentUser;
}

export async function getUserProfile(uid) {
    return getUser(uid);
}
