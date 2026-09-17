/* =========================================================
   PROJECTKART
   Firestore Users profile operations
   Collection name is exactly: Users
   ========================================================= */

import {
    arrayUnion,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    updateProfile
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "./firebase.js";

export const USERS_COLLECTION = "Users";
const DEVICE_STORAGE_KEY = "projectkart_device_token";

const PROFILE_WRITE_FIELDS = [
    "firstName",
    "lastName",
    "displayName",
    "phone",
    "address",
    "city",
    "state",
    "postalCode",
    "country"
];

function usersRef(uid) {
    return doc(db, USERS_COLLECTION, uid);
}

function trimValue(value) {
    return typeof value === "string" ? value.trim() : "";
}

function displayNameFrom(data) {
    const first = trimValue(data.firstName);
    const last = trimValue(data.lastName);
    const combined = `${first} ${last}`.trim();
    return trimValue(data.displayName) || combined || trimValue(data.name);
}

export function getOrCreateDeviceToken() {
    try {
        const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
        if (existing) {
            return existing;
        }

        const token = window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `pk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

        window.localStorage.setItem(DEVICE_STORAGE_KEY, token);
        return token;
    } catch (error) {
        console.error("Device token storage error:", error);
        return `pk_session_${Date.now()}`;
    }
}

export async function collectDeviceToken() {
    return getOrCreateDeviceToken();
}

function devicePayload(deviceToken) {
    return {
        token: deviceToken,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        platform: typeof navigator !== "undefined" ? navigator.platform : "",
        language: typeof navigator !== "undefined" ? navigator.language : "",
        updatedAt: new Date().toISOString()
    };
}

export function userDocRef(uid) {
    return usersRef(uid);
}

export async function getUser(uid) {
    if (!uid) {
        return null;
    }

    const snapshot = await getDoc(usersRef(uid));

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}

export async function createUserProfile(user, data = {}) {
    if (!user?.uid) {
        throw new Error("A signed-in user is required.");
    }

    const existing = await getUser(user.uid);
    const deviceToken = trimValue(data.deviceToken) || getOrCreateDeviceToken();
    const firstName = trimValue(data.firstName);
    const lastName = trimValue(data.lastName);
    const displayName = displayNameFrom({
        ...data,
        firstName,
        lastName
    }) || user.displayName || "";

    const emailVerified = Boolean(user.emailVerified);

    if (existing) {
        await updateDoc(usersRef(user.uid), {
            emailVerified,
            deviceToken,
            lastDevice: devicePayload(deviceToken),
            deviceTokens: arrayUnion(deviceToken),
            updatedAt: serverTimestamp()
        });
        return getUser(user.uid);
    }

    await setDoc(usersRef(user.uid), {
        uid: user.uid,
        firstName,
        lastName,
        displayName,
        email: String(user.email || data.email || ""),
        phone: trimValue(data.phone),
        address: trimValue(data.address),
        city: trimValue(data.city),
        state: trimValue(data.state),
        postalCode: trimValue(data.postalCode),
        country: trimValue(data.country) || "India",
        role: "user",
        accountStatus: "active",
        emailVerified,
        deviceToken,
        deviceTokens: [deviceToken],
        lastDevice: devicePayload(deviceToken),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    if (displayName && auth.currentUser?.uid === user.uid) {
        try {
            await updateProfile(auth.currentUser, { displayName });
        } catch (error) {
            console.error("Auth display name update error:", error);
        }
    }

    return getUser(user.uid);
}

export async function syncSessionProfile(user) {
    if (!user?.uid) {
        return null;
    }

    try {
        await user.reload();
    } catch (error) {
        console.error("Auth reload error:", error);
    }

    const profile = await getUser(user.uid);

    if (!profile) {
        return createUserProfile(user, {
            firstName: user.displayName || "",
            email: user.email,
            deviceToken: getOrCreateDeviceToken()
        });
    }

    const deviceToken = getOrCreateDeviceToken();

    await updateDoc(usersRef(user.uid), {
        emailVerified: Boolean(user.emailVerified),
        deviceToken,
        lastDevice: devicePayload(deviceToken),
        deviceTokens: arrayUnion(deviceToken),
        updatedAt: serverTimestamp()
    });

    return getUser(user.uid);
}

export async function updateUserProfile(uid, data) {
    if (!uid) {
        throw new Error("User ID is required.");
    }

    if (auth.currentUser?.uid !== uid) {
        throw new Error("You can only update your own profile.");
    }

    const cleanData = {};

    PROFILE_WRITE_FIELDS.forEach(field => {
        if (typeof data[field] === "string") {
            cleanData[field] = data[field].trim();
        }
    });

    if (cleanData.firstName !== undefined || cleanData.lastName !== undefined) {
        const current = await getUser(uid);
        cleanData.displayName = displayNameFrom({
            firstName: cleanData.firstName ?? current?.firstName ?? "",
            lastName: cleanData.lastName ?? current?.lastName ?? "",
            displayName: cleanData.displayName
        });
    }

    cleanData.updatedAt = serverTimestamp();

    await updateDoc(usersRef(uid), cleanData);

    if (cleanData.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, {
            displayName: cleanData.displayName
        });
    }

    return true;
}
