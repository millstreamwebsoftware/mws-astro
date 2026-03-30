import type { CollectionEntry, CollectionKey } from "astro:content";
import type { Props as Section } from "@layouts/Section.astro";
import type { Props as Breadcrumbs } from "@components/navigation/breadcrumbs/breadcrumbs.astro";
import type { Props as Slider } from "@components/layout/slider/slider.astro";
import type {
  Props as Blockquote,
  Prefs as BlockquotePrefs,
} from "@components/blockquote/blockquote.astro";

declare global {
  type Prettify<T> = {
    [K in keyof T]: T[K];
  } & {};

  var ENV_BOOKSHOP_LIVE: boolean;

  const grecaptcha = any;

  interface Window {
    inEditorMode?: boolean;
  }

  interface CalendarElement extends HTMLElement {
    calendar?: any;
  }

  interface FloatingUIElement extends HTMLElement {
    _cleanup?: Function;
  }

  interface MapElement extends HTMLElement {
    map?: any;
  }

  type PageStatus = "online" | "hidden" | "meta" | "offline";

  type CSSMixBlendMode =
    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "darken"
    | "lighten"
    | "color-dodge"
    | "color-burn"
    | "hard-light"
    | "soft-light"
    | "difference"
    | "exclusion"
    | "hue"
    | "saturation"
    | "color"
    | "luminosity"
    | "plus-darker"
    | "plus-lighter";

  type CssAlignX = "left" | "center" | "right";
  type CssAlignY = "top" | "center" | "bottom";
  type CssAlign =
    | `${CssAlignX} ${CssAlignY}`
    | `${CssAlignY} ${CssAlignX}`
    | CssAlignX
    | CssAlignY;

  interface Preferences {
    general: {
      site_name: string;
      canonical_url: string;
      browser_window_title_suffix: string;
      default_site_description: string | null;
      default_sharing_image: string | null;
      favicon: string;
      social: {
        name?: string;
        title?: string;
        link?: string;
        icon?: string | undefined;
      }[];
    };
    header: {
      theme?: "single" | "pod";
      logo_image: string;
      pin_header: boolean | string;
      contain: "header" | "content" | "none";
      navigation_menu_depth: number;
      show_logo: boolean;
      show_logo_mobile: boolean;
      show_navigation: boolean;
      show_socials: boolean;
      show_arrow: boolean;
      center_dropdowns?: boolean;
      titleCaret?: boolean | string;
      titleCaretOpen?: string;
    };
    page: {
      canvas_background_color: string;
      panel_background_color: string;
      maximum_page_width: number;
    };
    footer: {
      foreground_color?: string;
      background_color?: string;
      copyright: string;
      show_copyright: boolean;
      show_socials: boolean;
      show_top_button: boolean;
    };
    API: {
      google_maps?: { api_key: string };
      google_calendar?: { api_key: string };
      google_recaptcha_v3?: { api_key: string };
      imgix?: { domain: string; token: string };
    };
    components?: {
      breadcrumbs?: Prettify<Omit<Breadcrumbs, keyof Section>>;
      blockquote?: Prettify<Blockquote & BlockquotePrefs>;
      slider?: Prettify<Omit<Slider, keyof Section>>;
    };
    _input: Record<string, any>;
  }
}
