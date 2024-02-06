import type { CollectionEntry, CollectionKey } from "astro:content";
import type { TreeNode } from "@mws-astro/middleware";

declare global {
  namespace App {
    interface Locals {
      collections: Record<CollectionKey, CollectionEntry[]>;
      tree: TreeNode;
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
}
