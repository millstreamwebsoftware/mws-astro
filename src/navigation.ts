import { getCollection, getEntry, type CollectionEntry } from "astro:content";

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

export async function getPage(id: string) {
  const frontmatter =
    (await getEntry({ collection: "pages", id })) ||
    (await getEntry({ collection: "pages", id: `/${id}.md` })) ||
    (await getEntry({ collection: "pages", id: `/${id}/index.md` }));

  return frontmatter?.data;
}

export async function getPageChildren(id: string) {
  const idFragments = id.split("/");

  const filter: Parameters<typeof getCollection<"pages">>[1] = ({
    id: EntryId,
    data,
  }) => {
    if (data.status !== "online") return false;
    const entryFragments = EntryId.split("/");

    if (entryFragments.at(-1) === "index.md") entryFragments.pop();
    if (entryFragments.length !== idFragments.length + 1) return false;

    for (let i = 0; i < idFragments.length; i++) {
      if (entryFragments[i] !== idFragments[i]) return false;
    }

    return true;
  };

  return (await getCollection("pages", filter))
    .toSorted(({ data: { order: a } }, { data: { order: b } }) => a - b)
    .map((page) => ({ ...page, link: getLink(page) }));
}

export function getLink(page: CollectionEntry<"pages">) {
  return page.data.status === "online"
    ? `/${page.id
        .replaceAll(/(^\/|\/?$)/g, "")
        .replace(/\.md?/, "")
        .replace(/index?/, "")}`
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
