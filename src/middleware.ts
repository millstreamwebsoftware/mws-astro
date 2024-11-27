import { defineMiddleware } from "astro:middleware";
import {
  getCollection,
  type CollectionEntry,
  type CollectionKey,
  // type ContentEntryMap,
} from "astro:content";
import { collections } from "src/content/config";

export type AllCollections = Record<
  CollectionKey,
  CollectionEntry<CollectionKey>[]
>;

export const onRequest = defineMiddleware(async (ctx, next) => {
  const currentPath = ctx.params.slug;
  ctx.locals.collections = await getAllCollections(
    (page) => page.data.status === "online" || page.data.status === "meta",
  );

  ctx.locals.tree = makeTree(
    Object.values(ctx.locals.collections).flat(),
    currentPath,
  );

  ctx.locals.path = currentPath;
  return next();
});

async function getAllCollections(
  filter: (arg0: CollectionEntry<CollectionKey>) => boolean,
): Promise<AllCollections> {
  let allCollections: [string, CollectionEntry<CollectionKey>[]][] =
    await Promise.all(
      Object.keys(collections).map(async (k) => {
        return [k, await getCollection(k as CollectionKey, filter)];
      }),
    );

  let modifiedCollections = allCollections.map(([k, collection]) => {
    if (k == "pages" || typeof collection == "string") return [k, collection];

    collection.forEach((entry: Record<string, any>) => {
      entry._slug ?? (entry._slug = entry.slug);
      entry.slug = `${k}/${entry._slug}`;
    });

    return [k, collection];
  });

  return Object.fromEntries(modifiedCollections);
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
  status?: "online" | "hidden" | "meta" | "offline";
  order?: number;
  collection?: CollectionKey;
  selected?: Relationship;
}

function makeTree(
  pages: CollectionEntry<CollectionKey>[],
  currentPath?: string,
) {
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

  const pageList = Array.from(pages).map(
    (page: CollectionEntry<CollectionKey>) => {
      let slug = page.slug;
      // page.collection == "pages"
      //   ? page.slug
      //   : `${page.collection}/${page.slug}`;

      return {
        slug,
        href:
          page.data.status != "meta"
            ? "/" + slug.replace(/\/?index$/, "")
            : undefined,
        status: page.data.status,
        order: page.data.order,
        title: page.data.title,
        collection: page.collection,
        selected: isSelected(slug, currentSlug),
      };
    },
  );

  // Sort by path length then order - ensuring parents are before descendants if they exist
  const sorted = pageList.sort(
    (a: any, b: any) =>
      (a.slug.split("/").length || 0) - (b.slug.split("/").length || 0) ||
      a.order - b.order,
  );

  sorted.forEach((page: any) => {
    let path: Array<string> = page.slug.split("/") || [""];

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
                t.charAt(0).toUpperCase() + t.substring(1).toLowerCase(),
            ),
          // slug: path.slice(0, i + 1).join("/"),
          collection: page.collection,
          selected: isSelected(path.slice(0, i + 1).join("/"), currentSlug),
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
