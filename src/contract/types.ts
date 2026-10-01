export type Lang = "es" | "en" | "pt";

export type FormKey = "lead" | "interest";

export interface MountAttrs {
  readonly form: FormKey;
  readonly lang: Lang;
  readonly theme: "light" | "dark";
  readonly zoomLink: string | null;
  readonly webinarTopic: string | null;
  readonly webinarDate: string | null;
  readonly webinarTz: string | null;
  readonly leadSource: string | null;
  readonly bdmOwner: string | null;
  readonly opensAt: number | null;
  readonly closesAt: number | null;
  readonly closedUrl: string | null;
  readonly scheduleInvalid: boolean;
  readonly country: string | null;
}

export interface LeadValues {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly diallingCode: string;
  readonly phone: string;
  readonly country: string;
  readonly choice: string;
  readonly accepted: boolean;
}

export interface PageContext {
  readonly href: string;
  readonly title: string;
}

export type PayloadEntries = ReadonlyArray<readonly [string, string]>;
