import { z, type ZodType } from "zod";
import type { LeadValues } from "../../contract/types";
import type { Dict } from "../../i18n/types";
import { choiceField, sharedShape } from "../shared-fields";

const LEAD_CHOICES: ReadonlySet<string> = new Set(["Principiante", "Intermedio", "Avanzado"]);

export function createLeadSchema(dict: Dict): ZodType<LeadValues> {
  return z.object({
    ...sharedShape(dict),
    choice: choiceField(LEAD_CHOICES, dict.validation.tradingExperience),
  });
}
