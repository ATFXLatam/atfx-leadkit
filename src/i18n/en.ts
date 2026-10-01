import type { Dict } from "./types";

export const en = {
  labels: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    diallingCode: "Code",
    phone: "Phone",
    country: "Country of residence",
    tradingExperience: "Trading experience",
    interest: "Which topic would you like more information about?",
  },
  placeholders: {
    select: "Select",
  },
  acceptance:
    "By submitting this form, I agree that ATFX may use my contact information to contact me about its products and services. I can unsubscribe at any time. See our Privacy Policy.",
  phoneTitle: "Only numbers and phone characters (#, -, *, etc).",
  submit: "Register now",
  leadOptions: [
    { value: "Principiante", label: "0-6 months (Beginner)" },
    { value: "Intermedio", label: "6-12 months (Intermediate)" },
    { value: "Avanzado", label: "1+ year (Advanced)" },
  ],
  interestOptions: [
    { value: "Abrir cuenta", label: "Open an account" },
    { value: "Copytrade", label: "Copytrade" },
    { value: "IB Program", label: "IB Program" },
  ],
  validation: {
    firstName: "Enter your first name",
    lastName: "Enter your last name",
    email: "Invalid email address",
    diallingCode: "Select a dialing code",
    phone: "Invalid phone number",
    country: "Select your country",
    tradingExperience: "Select your experience",
    interest: "Select a topic",
    acceptance: "You must accept the terms to continue",
  },
  errors: {
    unknownResult: "We couldn't confirm whether the registration was sent.",
    generic: "We couldn't complete your registration. Please check your details.",
    rejected: "We couldn't accept the registration. Check the highlighted details.",
  },
  schedule: {
    notStarted: "Registration is not open yet",
    expired: "This campaign has ended",
  },
  thankYou: {
    title: "Registration confirmed!",
    message: "We've sent you an email with the access details. Check your inbox.",
    zoomCta: "Open Zoom now",
  },
  sf: { emailLang: "ENG", landingLang: "en" },
} satisfies Dict;
