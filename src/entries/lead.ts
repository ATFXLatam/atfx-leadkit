import { leadDefinition } from "../forms/lead/config";
import { observe } from "../core/mount";
import cssText from "../styles/leadkit.css";
import { injectStylesOnce } from "../styles/styles";

injectStylesOnce(cssText);
observe(leadDefinition);
