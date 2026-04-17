import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  componentRegistryPlugin,
  type ComponentPlugin,
} from "./src/component-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default (options?: Options): import("astro").AstroIntegration => {
  const plugins = options?.plugins ?? [];
  const packageComponentDir = resolve(__dirname, "src/components");

  return {
    name: "mws-astro",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig, config }) => {
        const overridesDir = resolve(
          fileURLToPath(config.root),
          options?.overrides ?? "src/components",
        );
        //         addDts({
        //           name: "mws-astro",
        //           content: `declare module "virtual:mws-astro/components" {
        //   export const components: Record<string, any>;
        // }`,
        // });
        if (options?.injectPages?.pages ?? true) {
          injectRoute({
            pattern: "[...slug]",
            entrypoint: resolve(__dirname, "src/pages/pages.astro"),
          });
        }
        if (options?.injectPages?.ccNewPage ?? true) {
          injectRoute({
            pattern: "cc-newpage",
            entrypoint: resolve(__dirname, "src/pages/cc-newpage.astro"),
          });
        }
        if (options?.injectPages?.search ?? true) {
          injectRoute({
            pattern: "search",
            entrypoint: resolve(__dirname, "src/pages/search.astro"),
          });
        }

        updateConfig({
          vite: {
            plugins: [
              componentRegistryPlugin(
                packageComponentDir,
                plugins,
                overridesDir,
              ),
            ],
          },
        });
      },
    },
  };
};

export type { ComponentPlugin };

interface Options {
  plugins?: ComponentPlugin[];
  overrides?: string;
  injectPages?: {
    pages?: boolean;
    search?: boolean;
    ccNewPage?: boolean;
  };
}
