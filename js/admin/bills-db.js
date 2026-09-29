/* =========================================================
   PROJECTKART
   Firestore bills — invoices, counter, realtime history
   Collections:
     bills
     billingMeta/invoiceCounter
   ========================================================= */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../firebase.js";
import { auth } from "../firebase.js";

export const BILLS_COLLECTION = "bills";
export const BILLING_META_COLLECTION = "billingMeta";
export const INVOICE_COUNTER_DOC = "invoiceCounter";

const LOCAL_BILLS_KEY = "projectkart_bills_v1";
const LOCAL_COUNTER_KEY = "projectkart_invoice_counter_v1";
const MIGRATED_KEY = "projectkart_bills_firebase_migrated_v1";

function billsRef() {
    return collection(db, BILLS_COLLECTION);
}

function billDoc(id) {
    return doc(db, BILLS_COLLECTION, id);
}

function counterRef() {
    return doc(db, BILLING_META_COLLECTION, INVOICE_COUNTER_DOC);
}

export function formatInvoiceNumber(n) {
    const num = Math.max(1, Math.floor(Number(n) || 1));
    return `PK-${String(num).padStart(5, "0")}`;
}

function toIso(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value?.toDate) {
        try {
            return value.toDate().toISOString();
        } catch (error) {
            return "";
        }
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function parseInvoiceSequence(invoiceNumber) {
    const match = String(invoiceNumber || "").match(/(\d+)\s*$/);
    return match ? Number(match[1]) : 0;
}

function monthFieldsFromDate(isoOrDate) {
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
    const safe = Number.isNaN(date.getTime()) ? new Date() : date;
    const year = safe.getFullYear();
    const month = safe.getMonth() + 1;
    return {
        year,
        month,
        monthKey: `${year}-${String(month).padStart(2, "0")}`
    };
}

function normalizeItems(items = []) {
    return (Array.isArray(items) ? items : []).map(item => ({
        productId: item.productId || "",
        productName: item.productName || "Item",
        type: item.type === "projectKit" ? "projectKit" : "component",
        sellingPrice: Number(item.sellingPrice) || 0,
        originalPrice: Number(item.originalPrice) || 0,
        quantity: Math.max(1, Number(item.quantity) || 1),
        lineTotal: Number(item.lineTotal) || 0,
        lineProfit: Number(item.lineProfit) || 0
    }));
}

function mapBill(snapshot) {
    const data = snapshot.data() || {};
    const items = normalizeItems(data.items);
    const invoiceDate = toIso(data.invoiceDate) || toIso(data.createdAt);
    const createdAt = toIso(data.createdAt) || invoiceDate;
    const months = monthFieldsFromDate(invoiceDate || createdAt);

    return {
        id: snapshot.id,
        invoiceNumber: data.invoiceNumber || "",
        invoiceDate,
        customerName: data.customerName || "",
        customerAddress: data.customerAddress || "",
        customerPhone: data.customerPhone || "",
        paymentMethod: data.paymentMethod || "Cash / UPI / Bank Transfer",
        items,
        totalAmount: Number(data.totalAmount) || 0,
        totalOriginalCost: Number(data.totalOriginalCost) || 0,
        totalProfit: Number(data.totalProfit) || 0,
        itemsSold: Number(data.itemsSold) || items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        year: Number(data.year) || months.year,
        month: Number(data.month) || months.month,
        monthKey: data.monthKey || months.monthKey,
        createdAt,
        updatedAt: toIso(data.updatedAt),
        createdBy: data.createdBy || ""
    };
}

export async function getInvoiceCounter() {
    const snap = await getDoc(counterRef());
    if (!snap.exists()) return 0;
    const value = Number(snap.data()?.lastNumber || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function peekNextInvoiceNumber() {
    const current = await getInvoiceCounter();
    return formatInvoiceNumber(current + 1);
}

export async function getAllBills() {
    try {
        const snap = await getDocs(query(billsRef(), orderBy("createdAt", "desc")));
        return snap.docs.map(mapBill);
    } catch (error) {
        // Fallback if createdAt index/order fails
        console.warn("Bills orderBy createdAt failed, using unordered fetch:", error);
        const snap = await getDocs(billsRef());
        return snap.docs
            .map(mapBill)
            .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    }
}

export async function getBillById(billId) {
    if (!billId) return null;
    const snap = await getDoc(billDoc(billId));
    return snap.exists() ? mapBill(snap) : null;
}

/**
 * Realtime listener for all bills (newest first).
 * @returns {() => void} unsubscribe
 */
export function watchBills(onData, onError) {
    let unsub = null;
    const billQuery = query(billsRef(), orderBy("createdAt", "desc"));

    const emit = snapshot => {
        const bills = snapshot.docs
            .map(mapBill)
            .sort((a, b) => String(b.createdAt || b.invoiceDate || "").localeCompare(String(a.createdAt || a.invoiceDate || "")));
        onData(bills);
    };

    unsub = onSnapshot(
        billQuery,
        emit,
        error => {
            console.warn("watchBills ordered listener failed, falling back:", error);
            if (typeof unsub === "function") unsub();
            unsub = onSnapshot(
                billsRef(),
                emit,
                fallbackError => {
                    console.error("watchBills fallback error:", fallbackError);
                    if (typeof onError === "function") onError(fallbackError);
                }
            );
        }
    );

    return () => {
        if (typeof unsub === "function") unsub();
    };
}

function buildBillPayload(billInput, invoiceNumber) {
    const items = normalizeItems(billInput.items);
    const invoiceDate = billInput.invoiceDate || new Date().toISOString();
    const months = monthFieldsFromDate(invoiceDate);
    const totalAmount = Number(billInput.totalAmount) || 0;
    const totalOriginalCost = Number(billInput.totalOriginalCost) || 0;
    const totalProfit = Number(billInput.totalProfit) || (totalAmount - totalOriginalCost);
    const itemsSold = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return {
        invoiceNumber,
        invoiceDate,
        customerName: String(billInput.customerName || "").trim(),
        customerAddress: String(billInput.customerAddress || "").trim(),
        customerPhone: String(billInput.customerPhone || "").trim(),
        paymentMethod: String(billInput.paymentMethod || "Cash / UPI / Bank Transfer").trim(),
        items,
        totalAmount,
        totalOriginalCost,
        totalProfit,
        itemsSold,
        year: months.year,
        month: months.month,
        monthKey: months.monthKey,
        createdBy: auth.currentUser?.uid || "",
        updatedAt: serverTimestamp()
    };
}

/**
 * Atomically allocate next PK-##### and save bill to Firestore.
 */
export async function saveBill(billInput) {
    const newBillRef = doc(billsRef());

    const saved = await runTransaction(db, async transaction => {
        const counterSnap = await transaction.get(counterRef());
        const current = counterSnap.exists() ? Number(counterSnap.data()?.lastNumber || 0) : 0;
        const next = (Number.isFinite(current) ? current : 0) + 1;
        const invoiceNumber = formatInvoiceNumber(next);

        const payload = buildBillPayload(billInput, invoiceNumber);
        payload.createdAt = serverTimestamp();

        transaction.set(counterRef(), {
            lastNumber: next,
            updatedAt: serverTimestamp()
        }, { merge: true });

        transaction.set(newBillRef, payload);

        return {
            id: newBillRef.id,
            ...payload,
            invoiceNumber,
            createdAt: payload.invoiceDate,
            updatedAt: payload.invoiceDate
        };
    });

    return saved;
}

export async function updateBill(billId, patch = {}) {
    if (!billId) throw new Error("Bill ID is required.");

    const existing = await getBillById(billId);
    if (!existing) throw new Error("Bill not found.");

    const merged = {
        ...existing,
        ...patch,
        items: patch.items ? normalizeItems(patch.items) : existing.items
    };

    const invoiceDate = merged.invoiceDate || existing.invoiceDate || new Date().toISOString();
    const months = monthFieldsFromDate(invoiceDate);
    const items = merged.items;
    const totalAmount = Number(merged.totalAmount) || 0;
    const totalOriginalCost = Number(merged.totalOriginalCost) || 0;
    const totalProfit = Number(merged.totalProfit) || (totalAmount - totalOriginalCost);
    const itemsSold = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    await updateDoc(billDoc(billId), {
        invoiceDate,
        customerName: String(merged.customerName || "").trim(),
        customerAddress: String(merged.customerAddress || "").trim(),
        customerPhone: String(merged.customerPhone || "").trim(),
        paymentMethod: String(merged.paymentMethod || "Cash / UPI / Bank Transfer").trim(),
        items,
        totalAmount,
        totalOriginalCost,
        totalProfit,
        itemsSold,
        year: months.year,
        month: months.month,
        monthKey: months.monthKey,
        updatedAt: serverTimestamp()
        // invoiceNumber / createdAt / id never overwritten
    });

    return {
        ...existing,
        ...merged,
        invoiceDate,
        totalAmount,
        totalOriginalCost,
        totalProfit,
        itemsSold,
        year: months.year,
        month: months.month,
        monthKey: months.monthKey,
        invoiceNumber: existing.invoiceNumber,
        id: billId
    };
}

export async function deleteBill(billId) {
    if (!billId) throw new Error("Bill ID is required.");
    await deleteDoc(billDoc(billId));
    return true;
}

/**
 * One-time migrate localStorage bills → Firestore if cloud is empty.
 */
export async function migrateLocalBillsIfNeeded() {
    if (localStorage.getItem(MIGRATED_KEY) === "1") {
        return { migrated: false, count: 0 };
    }

    let localBills = [];
    try {
        const raw = localStorage.getItem(LOCAL_BILLS_KEY);
        localBills = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(localBills)) localBills = [];
    } catch (error) {
        localBills = [];
    }

    const remote = await getAllBills();
    if (remote.length > 0 || localBills.length === 0) {
        localStorage.setItem(MIGRATED_KEY, "1");
        return { migrated: false, count: 0 };
    }

    // Oldest first so counter ends at latest
    const ordered = [...localBills].sort((a, b) =>
        String(a.createdAt || a.invoiceDate || "").localeCompare(String(b.createdAt || b.invoiceDate || ""))
    );

    let maxSeq = Number(localStorage.getItem(LOCAL_COUNTER_KEY) || 0) || 0;

    for (const bill of ordered) {
        const seq = parseInvoiceSequence(bill.invoiceNumber) || (maxSeq + 1);
        maxSeq = Math.max(maxSeq, seq);
        const invoiceNumber = bill.invoiceNumber || formatInvoiceNumber(seq);
        const ref = doc(billsRef());
        const payload = buildBillPayload(bill, invoiceNumber);
        const created = bill.createdAt ? new Date(bill.createdAt) : null;
        payload.createdAt = created && !Number.isNaN(created.getTime())
            ? created
            : serverTimestamp();
        await setDoc(ref, payload);
    }

    await setDoc(counterRef(), {
        lastNumber: maxSeq,
        updatedAt: serverTimestamp()
    }, { merge: true });

    localStorage.setItem(MIGRATED_KEY, "1");
    return { migrated: true, count: ordered.length };
}

export function buildMonthlyAnalytics(bills = []) {
    const byMonth = new Map();

    bills.forEach(bill => {
        const date = new Date(bill.invoiceDate || bill.createdAt);
        if (Number.isNaN(date.getTime())) return;

        const key = bill.monthKey || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleString("en-IN", { month: "short", year: "numeric" });
        const existing = byMonth.get(key) || {
            key,
            label,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            sales: 0,
            profit: 0,
            bills: 0,
            itemsSold: 0
        };

        existing.sales += Number(bill.totalAmount) || 0;
        existing.profit += Number(bill.totalProfit) || 0;
        existing.bills += 1;
        existing.itemsSold += Number(bill.itemsSold) || (bill.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        byMonth.set(key, existing);
    });

    return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function getCurrentMonthStats(bills = []) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthly = buildMonthlyAnalytics(bills).find(item => item.key === key);

    return monthly || {
        key,
        label: now.toLocaleString("en-IN", { month: "long", year: "numeric" }),
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        sales: 0,
        profit: 0,
        bills: 0,
        itemsSold: 0
    };
}
