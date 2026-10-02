import { z, type ZodType } from "zod";
import type { LeadValues } from "../../contract/types";
import type { Dict } from "../../i18n/types";
import { choiceField, sharedShape } from "../shared-fields";

const INTEREST_CHOICES: ReadonlySet<string> = new Set(["Abrir cuenta", "Copytrade", "IB Program"]);

export function createInterestSchema(dict: Dict): ZodType<LeadValues> {
  return z.object({
    ...sharedShape(dict),
    choice: choiceField(INTEREST_CHOICES, dict.validation.interest),
  });
}
