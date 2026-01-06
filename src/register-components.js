import { registerAstroComponent } from "@cloudcannon/editable-regions/astro";

import Richtext from "@components/richtext/richtext.astro";
import Columns from "@components/layout/columns/columns.astro";
import Slider from "@components/layout/slider/slider.astro";

registerAstroComponent("richtext", Richtext);
registerAstroComponent("layout/columns", Columns);
registerAstroComponent("layout/slider", Slider);
