export type Lang = "es" | "en" | "pt";

export interface Choice {
  readonly value: string;
  readonly label: string;
}

export interface Dict {
  readonly labels: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly diallingCode: string;
    readonly phone: string;
    readonly country: string;
    readonly tradingExperience: string;
    readonly interest: string;
  };
  readonly placeholders: {
    readonly select: string;
    readonly search: string;
  };
  readonly acceptance: string;
  readonly phoneTitle: string;
  readonly submit: string;
  readonly leadOptions: readonly Choice[];
  readonly interestOptions: readonly Choice[];
  readonly validation: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly diallingCode: string;
    readonly phone: string;
    readonly country: string;
    readonly tradingExperience: string;
    readonly interest: string;
    readonly acceptance: string;
  };
  readonly errors: {
    readonly unknownResult: string;
    readonly generic: string;
    readonly rejected: string;
    readonly retry: string;
  };
  readonly schedule: {
    readonly notStarted: string;
    readonly expired: string;
  };
  readonly thankYou: {
    readonly title: string;
    readonly message: string;
    readonly zoomCta: string;
  };
  readonly sf: {
    readonly emailLang: string;
    readonly landingLang: string;
  };
}
