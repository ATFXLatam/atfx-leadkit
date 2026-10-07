import type { Dict } from "./types";

export const es = {
  labels: {
    firstName: "Nombre",
    lastName: "Apellidos",
    email: "Email",
    diallingCode: "Prefijo",
    phone: "Teléfono",
    country: "País de residencia",
    tradingExperience: "Experiencia en trading",
    interest: "¿Sobre qué tema te gustaría recibir más información?",
  },
  placeholders: {
    select: "Selecciona",
    search: "Buscar...",
  },
  acceptance:
    "PENDIENTE_LEGAL: Autorizo a ATFX a usar mi información de contacto para responder mi solicitud.",
  phoneTitle: "Solo números y caracteres de teléfono (#, -, *, etc).",
  submit: "Regístrate ahora",
  leadOptions: [
    { value: "Principiante", label: "0-6 meses (Principiante)" },
    { value: "Intermedio", label: "6-12 meses (Intermedio)" },
    { value: "Avanzado", label: "1+ año (Avanzado)" },
  ],
  interestOptions: [
    { value: "Abrir cuenta", label: "Abrir cuenta" },
    { value: "Copytrade", label: "Copytrade" },
    { value: "IB Program", label: "IB Program" },
  ],
  validation: {
    firstName: "Ingresa tu nombre",
    lastName: "Ingresa tus apellidos",
    email: "Correo electrónico no válido",
    diallingCode: "Selecciona un prefijo",
    phone: "Teléfono no válido",
    country: "Selecciona tu país",
    tradingExperience: "Selecciona tu experiencia",
    interest: "Selecciona un tema",
    acceptance: "PENDIENTE_LEGAL: Debes autorizar que ATFX te contacte para responder tu solicitud.",
  },
  errors: {
    unknownResult: "No pudimos confirmar si el registro se envió.",
    generic: "No pudimos completar tu registro. Revisa los datos.",
    rejected: "No pudimos aceptar el registro. Revisa los datos marcados.",
    retry: "Intentar de nuevo",
  },
  schedule: {
    notStarted: "El registro aún no está abierto",
    expired: "Esta campaña ya finalizó",
  },
  thankYou: {
    title: "¡Registro confirmado!",
    message: "Te enviamos un correo con los detalles de acceso. Revisa tu bandeja de entrada.",
    zoomCta: "Abrir Zoom ahora",
  },
  sf: { emailLang: "ESP", landingLang: "esp" },
} satisfies Dict;
