/* ================================================================
   PROJECTKART
   Contact form — public submit → Firestore `contact` collection
================================================================ */

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
    contactForm.addEventListener("submit", handleContactSubmit);
}

async function handleContactSubmit(event) {
    event.preventDefault();

    const nameInput = contactForm.querySelector("[data-contact-name]");
    const emailInput = contactForm.querySelector("[data-contact-email]");
    const subjectInput = contactForm.querySelector("[data-contact-subject]");
    const messageInput = contactForm.querySelector("[data-contact-message]");
    const submitButton = contactForm.querySelector("[data-contact-submit]");
    const submitText = contactForm.querySelector("[data-contact-submit-text]");
    const spinner = contactForm.querySelector("[data-contact-spinner]");
    const status = contactForm.querySelector("[data-contact-status]");

    if (!nameInput || !emailInput || !subjectInput || !messageInput || !status) {
        return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const subjectValue = subjectInput.value.trim();
    const subjectLabel = subjectInput.options?.[subjectInput.selectedIndex]?.text?.trim() || subjectValue;
    const message = messageInput.value.trim();

    if (!name || !email || !subjectValue || !message) {
        setStatus(status, "Please fill in all the required fields.", "error");
        return;
    }

    if (!EMAIL_PATTERN.test(email)) {
        setStatus(status, "Please enter a valid email address.", "error");
        return;
    }

    if (message.length < 10) {
        setStatus(status, "Please write a slightly longer message.", "error");
        return;
    }

    submitButton.disabled = true;
    if (submitText) {
        submitText.textContent = "Sending...";
    }
    if (spinner) {
        spinner.hidden = false;
    }
    setStatus(status, "", null);

    try {
        await addDoc(collection(db, "contact"), {
            name,
            email,
            subject: subjectLabel,
            message,
            createdAt: serverTimestamp()
        });

        setStatus(status, "Your message has been sent successfully!", "success");
        contactForm.reset();
    } catch (error) {
        console.error("Contact form Firestore error:", error);
        setStatus(
            status,
            "Unable to send message. Please try again in a moment.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
        if (submitText) {
            submitText.textContent = "Send Message";
        }
        if (spinner) {
            spinner.hidden = true;
        }
    }
}

function setStatus(element, text, type) {
    element.textContent = text;
    element.classList.remove("success", "error", "is-success", "is-error");

    if (type === "success") {
        element.classList.add("success", "is-success");
    } else if (type === "error") {
        element.classList.add("error", "is-error");
    }
}
