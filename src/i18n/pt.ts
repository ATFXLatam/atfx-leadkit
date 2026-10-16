import type { Dict } from "./types";

export const pt = {
  labels: {
    firstName: "Nome",
    lastName: "Sobrenome",
    email: "E-mail",
    diallingCode: "Código",
    phone: "Telefone",
    country: "País de residência",
    tradingExperience: "Experiência em trading",
    interest: "Sobre qual tema você gostaria de receber mais informações?",
  },
  placeholders: {
    select: "Selecione",
    search: "Buscar...",
  },
  // Verbatim from ATFX's native Portuguese Elementor forms (garanta-sua-vaga-gratuita-*).
  acceptance:
    "Ao enviar este formulário, você concorda que a ATFX poderá usar as informações de contato fornecidas para entrar em contato com você a respeito de nossos produtos e serviços. Você pode cancelar a assinatura dessas comunicações a qualquer momento. Para obter mais detalhes sobre como cancelar a assinatura, bem como informações sobre nossas práticas de privacidade e nosso compromisso com a proteção de seus dados pessoais, consulte nossa Política de Privacidade.",
  phoneTitle: "Apenas números e caracteres de telefone (#, -, *, etc).",
  submit: "Inscreva-se agora",
  leadOptions: [
    { value: "Principiante", label: "0-6 meses (Iniciante)" },
    { value: "Intermedio", label: "6-12 meses (Intermediário)" },
    { value: "Avanzado", label: "1+ ano (Avançado)" },
  ],
  interestOptions: [
    { value: "Abrir cuenta", label: "Abrir conta" },
    { value: "Copytrade", label: "Copytrade" },
    { value: "IB Program", label: "IB Program" },
  ],
  validation: {
    firstName: "Insira seu nome",
    lastName: "Insira seu sobrenome",
    email: "E-mail inválido",
    diallingCode: "Selecione um código",
    phone: "Telefone inválido",
    country: "Selecione seu país",
    tradingExperience: "Selecione sua experiência",
    interest: "Selecione um tema",
    acceptance: "Você deve concordar com o uso das suas informações de contato para continuar.",
  },
  errors: {
    unknownResult: "Não foi possível confirmar se o cadastro foi enviado.",
    generic: "Não foi possível concluir seu registro. Verifique seus dados.",
    rejected: "Não foi possível aceitar o cadastro. Verifique os dados marcados.",
    retry: "Tentar novamente",
  },
  schedule: {
    notStarted: "O cadastro ainda não está aberto",
    expired: "Esta campanha já terminou",
  },
  thankYou: {
    title: "Inscrição confirmada!",
    message: "Enviamos um e-mail com os detalhes de acesso. Verifique sua caixa de entrada.",
    zoomCta: "Abrir Zoom agora",
  },
  sf: { emailLang: "PTG", landingLang: "pt" },
} satisfies Dict;
