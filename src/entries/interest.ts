import { interestDefinition } from "../forms/interest/config";
import { observe } from "../core/mount";
import cssText from "../styles/leadkit.css";
import { injectStylesOnce } from "../styles/styles";

injectStylesOnce(cssText);
observe(interestDefinition);
