import { defineCollection, z } from "astro:content";

const pagesCollection = defineCollection({
  type: "content", // v2.5.0 and later
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    browserTitle: z.string().optional(),
    note: z.string().optional(),
    categories: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
    publishDate: z.date().optional(),
    expiryDate: z.date().optional(),
    status: z.enum(["online", "hidden", "offline"]).default("online"),
    content_blocks: z.array(z.any()),
  }),
});

export const collections = {
  pages: pagesCollection,
};
