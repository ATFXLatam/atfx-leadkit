import { en } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import type { Dict, Lang } from "./types";

const DICTS: Readonly<Record<Lang, Dict>> = { es, en, pt };

export function resolveDict(lang: Lang): Dict {
  return DICTS[lang];
}
