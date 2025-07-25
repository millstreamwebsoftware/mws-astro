import {
  getCollection,
  getEntry,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";

export function urlToId(url: string) {
  var _url = url;

  try {
    _url = new URL(url).pathname;
  } catch {}

  return _url.replaceAll(/(^\/|\/$)/g, "");
}

function clog<T>(a: T): T {
  console.log(a);
  return a;
}

function cleanId(slug: string) {
  // return slug.match(/^\/?(.*?)(?:\/?index)?\.?(?:md|mdx)?\/?$/)?.[1] || "";
  return stripIndex(stripFiletype(stripSlashes(slug)));
}

function stripSlashes(slug: string) {
  return slug.replaceAll(/(^\/|\/?$)/g, "");
}

function stripIndex(slug: string) {
  return slug.replace(/(\/|^)index$/, "");
}

function stripFiletype(slug: string) {
  return slug.replace(/\.(md|mdx)$/, "");
}

export async function getPage(id: string) {
  const frontmatter =
    (await getEntry({ collection: "pages", id })) ||
    (await getEntry({ collection: "pages", id: `/${id}.md` })) ||
    (await getEntry({ collection: "pages", id: `/${id}/index.md` }));

  return frontmatter?.data;
}

export async function getPageChildren<T extends CollectionKey>(
  id: string,
  collection: T,
): Promise<(CollectionEntry<T> & { link: string })[]> {
  const idFragments = stripSlashes(id)
    .split("/")
    .filter((i) => i.length);

  const filter: Parameters<typeof getCollection<typeof collection>>[1] = ({
    id: entryId,
    collection,
    data,
  }) => {
    if (collection === "pages" && data.status !== "online") return false;
    const entryFragments = stripSlashes(entryId).split("/");

    if (entryFragments.at(-1) === "index.md") entryFragments.pop();
    if (entryFragments.length !== idFragments.length + 1) return false;

    for (let i = 0; i < idFragments.length; i++) {
      if (entryFragments[i] !== idFragments[i]) return false;
    }

    return true;
  };

  return (await getCollection(collection, filter))
    .sort(({ data: { order: a } }, { data: { order: b } }) => a - b)
    .map((page) => ({ ...page, link: getLink(page) }));
}

export async function getPageAncestors(
  id: string,
  collection: CollectionKey = "pages",
) {
  const idFragments = stripSlashes(id)
    .split("/")
    .filter((i) => i.length);

  const ancestors: CollectionEntry<typeof collection>[] = [];

  for (let i = 0; i < idFragments.length; i++) {
    const entryId = idFragments.slice(0, i + 1).join("/");
    const entry =
      (await getEntry({ collection, id: entryId })) ||
      (await getEntry({ collection, id: `/${entryId}.md` })) ||
      (await getEntry({ collection, id: `/${entryId}/index.md` }));

    entry && ancestors.push(entry);
  }

  return ancestors.map((page) => ({ ...page, link: getLink(page) }));

  // const filter: Parameters<typeof getCollection<typeof collection>>[1] = ({
  //   id: EntryId,
  //   collection,
  //   data,
  // }) => {
  //   if (collection === "pages" && data.status !== "online") return false;
  //   const entryFragments = EntryId.replaceAll(/(^\/|\/?$)/g, "").split("/");

  //   if (entryFragments.at(-1) === "index.md") entryFragments.pop();
  //   if (entryFragments.length !== idFragments.length + 1) return false;

  //   for (let i = 0; i < idFragments.length; i++) {
  //     if (entryFragments[i] !== idFragments[i]) return false;
  //   }

  //   return true;
  // };

  // return (await getCollection(collection, filter))
  //   .toSorted(({ data: { order: a } }, { data: { order: b } }) => a - b)
  //   .map((page) => ({ ...page, link: getLink(page) }));
}

export function getLink(page: CollectionEntry<"pages">) {
  return page.data.status === "online"
    ? `/${cleanId(page.id)}`
    : page.data.link || "";
}

export function getSelected(page: CollectionEntry<"pages">, id: string) {
  if (page.id === id) return true;
  return false;
  // const idFragments = id.split("/");
  // const entryFragments = page.id.split("/");
  // if (entryFragments.at(-1) === "index.md") entryFragments.pop();
  // if (entryFragments.length > idFragments.length) return false;
}

export interface TreeRoot {
  children: Record<string, TreeNode<CollectionKey>>;
}

export interface TreeNode<T extends CollectionKey> {
  id: string;
  collection?: T;
  data?: CollectionEntry<T>["data"];
  children?: Record<string, TreeNode<CollectionKey>>;
  parent?: TreeNode<CollectionKey> | TreeRoot;
  selected?: "selected" | "ancestor" | null;
}

export function getTree(
  items: CollectionEntry<CollectionKey>[],
  { select, depth }: { select?: string; depth?: number } = {},
) {
  const tree: TreeRoot = { children: {} };

  const treeItems: Array<TreeNode<CollectionKey>> = Array.from(items)
    .map((item) => ({
      id: cleanId(item.id),
      collection: item.collection,
      data: item.data,
      selected: null,
    }))
    .filter((i) => !(depth && i.id.split("/").length > depth));

  // Sort by path depth - ensuring parents are before descendants if they exist (breadth-first)
  treeItems.sort(
    (a, b) =>
      a.id.split("/").length - b.id.split("/").length ||
      (a.data?.order !== undefined && b.data?.order !== undefined
        ? a.data!.order - b.data!.order
        : 0),
  );

  let selectedItem: TreeNode<CollectionKey> | undefined;

  treeItems.forEach((item) => {
    const fragments = item.id.split("/");
    let cursor: TreeRoot | TreeNode<CollectionKey> = tree;
    let parent: TreeNode<CollectionKey> | undefined = undefined;

    for (var i = 0; i < fragments.length; i++) {
      if (!("children" in cursor)) cursor.children = {};

      if (!cursor.children!.hasOwnProperty(fragments[i])) {
        cursor.children![fragments[i]] = {
          id: stripSlashes(
            ("id" in cursor ? cursor.id : "") + `/${fragments[i]}`,
          ),
        };
      }

      cursor = cursor.children![fragments[i]];
      cursor.parent = parent;
      parent = cursor;
    }

    Object.assign(cursor, item);

    if ("id" in cursor && select === cursor.id) {
      selectedItem = cursor;
    }
  });

  if (selectedItem) {
    selectedItem.selected = "selected";

    while (true) {
      if (!(selectedItem && selectedItem.parent && "id" in selectedItem.parent))
        break;
      selectedItem = selectedItem.parent;
      selectedItem.selected = "ancestor";
    }
  }

  return tree;
}
