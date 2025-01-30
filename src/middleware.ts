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
    (page) => page.data.status !== "offline",
  );

  ctx.locals.tree = makeTree(
    Object.values(ctx.locals.collections).flat(),
    currentPath,
  );

  // console.log(ctx.locals.tree);
  // console.log(
  //   JSON.stringify(
  //     ctx.locals.tree,
  //     function (key, value) {
  //       if (key == "parent") {
  //         return value?.slug;
  //       } else {
  //         return value;
  //       }
  //     },
  //     4,
  //   ),
  // );
  // console.log(
  //   "Parent:",
  //   ctx.locals.tree?.children?.community?.children?.parish?.parent,
  // );

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
  parent?: TreeNode;
  title?: string;
  slug?: string;
  href?: string;
  link?: string;
  status?: "online" | "hidden" | "meta" | "offline";
  order?: number;
  collection?: CollectionKey;
  selected?: Relationship;
}

function stripIndex(slug: string) {
  return slug.replace(/\/?index$/, "");
}

/**
 * Build a tree for navigation from the list of pages we get from the astro content collections api
 * @param pages - collection entries
 * @param currentPath - the path of the page we are rendering
 * @returns a tree for generating the site navigation
 */
function makeTree(
  pages: CollectionEntry<CollectionKey>[],
  currentPath?: string,
) {
  const currentSlug = currentPath || "";

  const tree: TreeNode = {};

  const pageList = Array.from(pages).map(
    (page: CollectionEntry<CollectionKey>) => {
      let slug = stripIndex(page.slug);

      return {
        slug,
        href: page.data.status != "meta" ? "/" + slug : page.data.link,
        status: page.data.status,
        order: page.data.order,
        title: page.data.title,
        collection: page.collection,
        selected: Relationship.None,
      };
    },
  );

  // Sort by path length then order - ensuring parents are before descendants if they exist
  const sorted = pageList.sort(
    (a: any, b: any) =>
      (a.slug.split("/").length || 0) - (b.slug.split("/").length || 0) ||
      a.order - b.order,
  );

  let selectedPage: undefined | TreeNode;

  sorted.forEach((page: any) => {
    let path: Array<string> = page.slug.split("/") || [""];

    // Create a cursor at the tree root
    let cursor = tree;
    let parent = undefined;

    for (var i = 0; i < path.length; i++) {
      if (!("children" in cursor)) {
        cursor.children = {};
      }

      if (cursor?.children == undefined) break;

      // Page doesn't exist - Create an entry for the directory
      if (!(path[i] in cursor.children)) {
        cursor.children[path[i]] = {
          title: path[i]
            .replaceAll("-", " ")
            .replace(
              /\w\S*/g,
              (t: string) =>
                t.charAt(0).toUpperCase() + t.substring(1).toLowerCase(),
            ),
          slug: path.slice(0, i + 1).join("/"),
          collection: page.collection,
          // selected: isSelected(path.slice(0, i + 1).join("/"), currentSlug),
          selected: Relationship.None,
          status: "meta",
          parent: cursor.parent,
        };
      }

      // Move cursor to child
      cursor = cursor.children[path[i]];
      cursor.parent = parent;
      parent = cursor;
    }

    // Assign page properties to the final node
    Object.assign(cursor, page);

    if (currentSlug === stripIndex(cursor.slug || "")) {
      selectedPage = cursor;
    }
  });

  // Mark selected page and ancestors
  if (selectedPage) {
    selectedPage.selected = Relationship.Selected;

    while (selectedPage) {
      selectedPage = selectedPage.parent;
      selectedPage && (selectedPage.selected = Relationship.Ancestor);
    }
  }

  return tree;
}
