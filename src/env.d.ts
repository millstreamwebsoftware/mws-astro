import type { CollectionEntry, CollectionKey } from "astro:content";
import type { TreeNode } from "@mws-astro/middleware";

declare global {
  namespace App {
    interface Locals {
      collections: Record<CollectionKey, CollectionEntry[]>;
      tree: TreeNode;
    }
  }
}
