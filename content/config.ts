import { defineCollection, z } from "astro:content";

// type ContentBlock =
//   | z.infer<typeof astrotestSchema>
//   | z.infer<typeof formSchema>
//   | z.infer<typeof gallerySchema>
//   | z.infer<typeof sliderSchema>
//   | z.infer<typeof mapSchema>
//   | z.infer<typeof richtextSchema>
//   | z.infer<typeof socialSchema>
//   | ColumnsSchema; // Can't use z.infer here, use explicit type

// const contentBlock: z.ZodType<ContentBlock> = z.lazy(() =>
//   z.discriminatedUnion("_bookshop_name", [
//     columnsSchema,
//     astrotestSchema,
//     formSchema,
//     gallerySchema,
//     sliderSchema,
//     mapSchema,
//     richtextSchema,
//     socialSchema,
//   ])
// );

// const astrotestSchema = z.object({
//   _bookshop_name: z.literal("astrotest"),
//   text: z.string(),
// });

// const formSchema = z.object({
//   _bookshop_name: z.literal("form"),
//   action: z.string(),
//   name: z.string(),
//   form_blocks: z.array(z.any()),
//   background_color: z.string().optional(),
//   classes: z.any().optional(),
//   key: z.string().optional(),
// });

// const gallerySchema = z.object({
//   _bookshop_name: z.literal("gallery"),
//   images: z.array(z.any()),
//   height: z.number(),
//   columns: z.number(),
//   indent: z.boolean(),
// });

// const columnsSchema = z.object({
//   _bookshop_name: z.literal("layout/columns"),
//   content_blocks: contentBlock.array(),
//   collapse: z.boolean().optional(),
//   layout: z.array(z.number()).optional(),
//   key: z.string().optional(),
// }); // With TS 4.9, could add `satisfies z.ZodType<RecursiveElement>` here
// type ColumnsSchema = {
//   _bookshop_name: "layout/columns";
//   content_blocks: ContentBlock[];
// };

// const sliderSchema = z.object({
//   _bookshop_name: z.literal("layout/slider"),
//   slides: z.array(z.any()),
//   height: z.number(),
//   gap: z.number().optional(),
//   autoplay: z.number().optional(),
//   perView: z.number().optional(),
//   focusAtCenter: z.boolean().optional(),
//   focusAt: z.number().optional(),
//   bound: z.boolean().optional(),
//   showBullets: z.boolean().optional(),
//   showArrows: z.boolean().optional(),
//   transition: z.string().optional(),
//   animationDuration: z.number().optional(),
//   hoverpause: z.boolean().optional(),
//   indent: z.boolean().optional(),
//   classes: z.array(z.string()).optional(),
//   key: z.string().optional(),
// });

// const mapSchema = z.object({
//   _bookshop_name: z.literal("map"),
//   lat: z.number(),
//   lng: z.number(),
//   zoom: z.number().optional(),
//   height: z.number(),
//   style: z.any().optional(),
//   indent: z.boolean().optional(),
//   key: z.string().optional(),
// });

// const richtextSchema = z.object({
//   _bookshop_name: z.literal("richtext"),
//   content: z.string(),
//   background_color: z.string().optional(),
//   classes: z.any().optional(),
//   style: z.record(z.string(), z.string()).optional(),
// });

// const socialSchema = z.object({
//   _bookshop_name: z.literal("social"),
// });

const pagesCollection = defineCollection({
  type: "content", // v2.5.0 and later
  schema: ({ image }) =>
    z.object({
      _schema: z.any().optional(),
      title: z.string(),
      description: z.string().optional(),
      browserTitle: z.string().optional(),
      note: z.string().optional(),
      categories: z.array(z.string()).optional(),
      thumbnail: image().optional(),
      publishDate: z.date().optional(),
      expiryDate: z.date().optional(),
      status: z.enum(["online", "hidden", "offline"]).default("online"),
      order: z.number().default(256),
      content_blocks: z.array(z.any()),
      show_global_header: z.boolean().default(true),
      show_global_footer: z.boolean().default(true),
    }),
});

export const collections = {
  pages: pagesCollection,
};
