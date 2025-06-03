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

function stripIndex(slug: string) {
  return slug.replace(/(\/|^)index$/, "");
}

export async function getPage(id: string) {
  const frontmatter =
    (await getEntry({ collection: "pages", id })) ||
    (await getEntry({ collection: "pages", id: `/${id}.md` })) ||
    (await getEntry({ collection: "pages", id: `/${id}/index.md` }));

  return frontmatter?.data;
}

export async function getPageChildren(
  id: string,
  collection: CollectionKey = "pages",
) {
  const idFragments = id
    .replaceAll(/(^\/|\/?$)/g, "")
    .split("/")
    .filter((i) => i.length);

  const filter: Parameters<typeof getCollection<typeof collection>>[1] = ({
    id: EntryId,
    collection,
    data,
  }) => {
    if (collection === "pages" && data.status !== "online") return false;
    const entryFragments = EntryId.replaceAll(/(^\/|\/?$)/g, "").split("/");

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
  const idFragments = id
    .replaceAll(/(^\/|\/?$)/g, "")
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
    ? `/${stripIndex(
        page.id.replaceAll(/(^\/|\/?$)/g, "").replace(/\.md?/, ""),
      )}`
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
