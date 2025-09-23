import type { CollectionEntry, CollectionKey } from "astro:content";

declare global {
  type Prettify<T> = {
    [K in keyof T]: T[K];
  } & {};

  var ENV_BOOKSHOP_LIVE: boolean;

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
      navigation_menu_depth: number;
      show_logo: boolean;
      show_logo_mobile: boolean;
      show_navigation: boolean;
      show_socials: boolean;
      show_arrow: boolean;
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
      imgix?: { domain: string; token: string };
    };
    _input: Record<string, any>;
  }
}
