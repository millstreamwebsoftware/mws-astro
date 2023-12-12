import { defineMiddleware } from "astro:middleware";
import { getCollection, type CollectionEntry } from "astro:content";
import { collections } from "src/content/config";

export const onRequest = defineMiddleware(async (ctx, next) => {
  const pages = await getCollection("pages", (page) => {
    return page.data.status === "online";
  });

  const currentPath = ctx.params.slug;
  ctx.locals.tree = makeTree(pages, currentPath);

  ctx.locals.collections = await getAllCollections();

  return next();
});

async function getAllCollections() {
  type collectionsKey = keyof typeof collections;

  return Object.keys(collections).reduce(async (c, name) => {
    c[name] = await getCollection(name as collectionsKey);
    return c;
  }, {} as any);
}

export enum Relationship {
  None = 0,
  Ancestor,
  Selected,
}

export interface TreeNode {
  children?: Record<string, TreeNode>;
  title?: string;
  slug?: string;
  href?: string;
  order?: number;
  selected?: Relationship;
}

function makeTree(pages: CollectionEntry<"pages">[], currentPath?: string) {
  const currentSlug = currentPath || "";

  // Determine which pages are 'selected' relative to the request path
  function isSelected(slug: string, selection: string): Relationship {
    const realSlug = slug.replace(/\/?index$/, "");
    const slugFragments = realSlug.split("/");
    const selectionFragments = selection.split("/");

    switch (true) {
      // Requested page is this page
      case realSlug === currentSlug:
        return Relationship.Selected;

      // Pages are not related
      case selectionFragments.length <= slugFragments.length:
      default:
        return Relationship.None;

      // Requested page is a child of this page
      case slugFragments.every((val, i) => val === selectionFragments[i]):
        return Relationship.Ancestor;
    }
  }

  const tree: TreeNode = {};

  const pageList = Array.from(pages).map((page: CollectionEntry<"pages">) => {
    return {
      slug: page.slug,
      href: page.slug.replace(/\/?index$/, ""),
      order: page.data.order,
      title: page.data.title,
      selected: isSelected(page.slug, currentPath || ""),
    };
  });

  // Sort by path length then order - ensuring parents are before descendants if they exist
  const sorted = pageList.sort(
    (a: any, b: any) =>
      (a.slug.split("/").length || 0) - (b.slug.split("/").length || 0) ||
      a.order - b.order
  );

  sorted.forEach((page: any) => {
    let path = page.slug.split("/") || [""];

    // Create a cursor at the tree root
    let cursor = tree;

    for (var i = 0; i < path.length; i++) {
      if (!("children" in cursor)) {
        cursor.children = {};
      }

      if (cursor?.children == undefined) break;

      // Page doesn't exist - Create an entry for the directory
      if (!(path[i] in cursor.children)) {
        cursor.children[path[i]] = {
          // parent: undefined,
          title: path[i]
            .replaceAll("-", " ")
            .replace(
              /\w\S*/g,
              (t: string) =>
                t.charAt(0).toUpperCase() + t.substring(1).toLowerCase()
            ),
          selected: isSelected(
            path.slice(0, i + 1).join("/"),
            currentPath || ""
          ),
        };
      }

      // Move cursor to child
      cursor = cursor.children[path[i]];
    }

    // Assign page properties to the final node
    Object.assign(cursor, page);
  });

  return tree;
}
