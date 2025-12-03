export default (options?: Options): import("astro").AstroIntegration => ({
  name: "mws-astro",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      injectRoute({
        pattern: "[...slug]",
        entrypoint: "src/mws-astro/src/pages/pages.astro",
      });
      if (options?.injectPages?.ccNewPage ?? true) {
        injectRoute({
          pattern: "cc-newpage",
          entrypoint: "src/mws-astro/src/pages/cc-newpage.astro",
        });
      }
      if (options?.injectPages?.search ?? true) {
        injectRoute({
          pattern: "search",
          entrypoint: "src/mws-astro/src/pages/search.astro",
        });
      }
    },
  },
});

interface Options {
  injectPages?: {
    search?: boolean;
    ccNewPage?: boolean;
  };
}
