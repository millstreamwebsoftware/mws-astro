import {
  getCollection,
  getEntry,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";

export function urlToId(
  url: string | URL,
  collection: CollectionKey = "pages",
) {
  var _url = undefined;
  const pre = new RegExp(`^\/?${collection === "pages" ? "" : collection}`);

  if (url instanceof URL) {
    _url = url.pathname;
  } else {
    try {
      _url = new URL(url).pathname;
    } catch {}
  }

  if (!_url) return "";
  _url = _url.replace(pre, "");
  return _url.replaceAll(/(^\/|\/$)/g, "");
}

function cleanId(slug: string) {
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

export async function getPage<C extends CollectionKey = "pages">(
  id: string,
  collection: C,
): Promise<CollectionEntry<C> | undefined> {
  if (ENV_BOOKSHOP_LIVE || !import.meta.env.SSR) {
    return ((await getEntry({ collection, id: `/${id}.md` })) ||
      (await getEntry({ collection, id: `/${id}/index.md` }))) as
      | CollectionEntry<C>
      | undefined;
  }

  return (await getEntry({ collection, id })) as CollectionEntry<C> | undefined;
}

export async function getPageChildren<T extends CollectionKey>(
  id: string,
  collection: T,
  filter: (entry: CollectionEntry<T>) => boolean = () => true,
): Promise<(CollectionEntry<T> & { link: string | undefined })[]> {
  const idFragments = stripSlashes(id)
    .split("/")
    .filter((i) => i.length);

  const childfilter: Parameters<typeof getCollection<typeof collection>>[1] = ({
    id: entryId,
    data,
  }) => {
    if (
      "status" in data &&
      data.status !== "online" &&
      !(data.status === "meta" && data.link?.length)
    )
      return false;
    const entryFragments = stripSlashes(entryId).split("/");

    if (entryFragments.at(-1) === "index.md") entryFragments.pop();
    if (entryFragments.length !== idFragments.length + 1) return false;

    for (let i = 0; i < idFragments.length; i++) {
      if (entryFragments[i] !== idFragments[i]) return false;
    }

    return true;
  };

  const _filter = (entry: CollectionEntry<T>) =>
    [childfilter, filter].every((f) => f(entry));

  return (await getCollection(collection, _filter))
    .sort(sortByOrder)
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
    const entry = await getPage(entryId, collection);
    entry && ancestors.push(entry);
  }

  return ancestors.map((page) => ({ ...page, link: getLink(page) }));
}

export function getLink<T extends CollectionEntry<CollectionKey>>(page: T) {
  const collection = page.collection === "pages" ? "" : `/${page.collection}`;
  return page.data.status === "online"
    ? `${collection}/${cleanId(page.id)}`.toLowerCase()
    : page.data.link || undefined;
}

function sortByDepth<T extends { id: string }>(a: T, b: T): number {
  return a.id.split("/").length - b.id.split("/").length;
}

function sortByOrder<
  T extends { data?: CollectionEntry<CollectionKey>["data"] },
>(a: T, b: T): number {
  if (a.data && b.data && "order" in a.data && "order" in b.data)
    return a.data.order - b.data.order;
  return 0;
}

export interface TreeRoot<T extends CollectionKey> {
  collection?: T;
  children: Record<string, TreeNode<T>>;
}

export interface TreeNode<T extends CollectionKey> {
  id: string;
  collection?: T;
  data?: CollectionEntry<T>["data"];
  children?: Record<string, TreeNode<T>>;
  parent?: TreeNode<T> | TreeRoot<T>;
  selected?: "selected" | "ancestor" | null;
  link?: string;
  type: "directory" | "page";
  status: "online" | "hidden" | "meta" | "offline";
}

export function getTree<T extends CollectionKey>(
  items: CollectionEntry<T>[],
  { select, depth }: { select?: string; depth?: number } = {},
) {
  const tree: TreeRoot<T> = { children: {} };

  const treeItems: Array<TreeNode<CollectionKey>> = Array.from(items)
    .map(
      (item) =>
        ({
          id: cleanId(item.id).toLowerCase(),
          collection: item.collection,
          data: item.data,
          selected: null,
          link: getLink(item),
          type: "page",
          status: item.data?.status || "online",
        }) as TreeNode<T>,
    )
    .filter((i) => !(depth && i.id.split("/").length > depth));

  // Sort by path depth - ensuring parents are before descendants if they exist (breadth-first)
  treeItems.sort((a, b) => sortByDepth(a, b) || sortByOrder(a, b));

  let selectedItem: TreeNode<T> | undefined;

  treeItems.forEach((item) => {
    const fragments = item.id.split("/");
    let cursor: TreeRoot<T> | TreeNode<T> = tree;
    let parent: TreeNode<T> | undefined = undefined;

    for (var i = 0; i < fragments.length; i++) {
      if (!("children" in cursor)) cursor.children = {};

      if (!cursor.children!.hasOwnProperty(fragments[i])) {
        cursor.children![fragments[i]] = {
          id: stripSlashes(
            ("id" in cursor ? cursor.id : "") + `/${fragments[i]}`,
          ),
          type: "directory",
          status: "meta",
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

export function getTreeNode<T extends CollectionKey>(
  tree: TreeRoot<T> | TreeNode<T>,
  path: string | undefined,
  relpath: string = "",
  // parent: boolean = false,
): TreeRoot<T> | TreeNode<T> | undefined {
  if (!path) return tree;

  const abspath = path.startsWith("/") ? path : relpath + "/" + path;

  const targetFragments = abspath?.split("/").filter((frg) => frg !== "");
  let cursor: TreeRoot<T> | TreeNode<T> = tree;
  if (!cursor?.children) return;

  for (let i = 0; i < targetFragments.length; i++) {
    let fragment = targetFragments[i];

    if (/^\.\.?$/.test(fragment)) {
      if (fragment.length < 2) {
        continue;
      }

      if (!("parent" in cursor)) continue;

      if (!cursor.parent) {
        // console.warn(
        //   `Could not resolve path ${abspath} - Attempted to access undefined parent`,
        // );
        // console.log(tree);
        // return;
        cursor = tree;
        continue;
      }

      cursor = cursor.parent;
    } else {
      if (cursor?.children == undefined || !(fragment in cursor.children)) {
        console.warn(`Could not resolve path ${abspath}`);
        return;
      }

      cursor = cursor.children[fragment];
    }
  }

  // Reorder tree to place children inside their sibling index (/file/index -> /file/)
  if (cursor.children?.index) {
    cursor = Object.assign(Object.assign({}, cursor), cursor.children.index);
    delete cursor.children?.index;
  }

  return cursor;
}
