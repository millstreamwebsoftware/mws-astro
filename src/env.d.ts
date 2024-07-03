import type { CollectionEntry, CollectionKey } from "astro:content";
import type { TreeNode } from "@mws-astro/middleware";

declare global {
  namespace App {
    interface Locals {
      collections: Record<CollectionKey, CollectionEntry[]>;
      tree: TreeNode;
      path: string | undefined;
    }
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
      logo_image: string;
      pin_header: boolean;
      navigation_menu_depth: number;
      show_logo: boolean;
      show_navigation: boolean;
      show_socials: boolean;
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
