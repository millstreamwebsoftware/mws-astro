import { globSync } from "node:fs";
import { join } from "node:path";
import type { Plugin, ViteDevServer } from "vite";

export const VIRTUAL_MODULE_ID = "virtual:mws-astro/components";
const RESOLVED_ID = "\0" + VIRTUAL_MODULE_ID;

export interface ComponentPlugin {
  name: string;
  componentDir: string;
}

/**
 * Derives a component registry key from an absolute .astro file path.
 *
 * Examples:
 *   .../components/accordion/accordion.astro  → "accordion"
 *   .../components/card-index/cards/card/card.astro  → "card-index/cards/card"
 *   .../components/layout/slider/slider.astro  → "layout/slider"
 */
function toComponentKey(absPath: string): string {
  const parts = absPath
    .replace(/^.*components\//, "")
    .split(".")[0]
    .split("/");
  if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop();
  }
  return parts.join("/");
}

function findAstroFiles(dir: string): string[] {
  try {
    return globSync("**/*.astro", { cwd: dir }).map((f) => join(dir, f));
  } catch {
    return []; // dir doesn't exist (optional plugin not installed)
  }
}

/**
 * Vite plugin that exposes `virtual:mws-astro/components` — a merged component
 * registry built from:
 *   1. The package's own src/components/
 *   2. Any registered plugin component directories (optional packages)
 *   3. The consumer project's src/components/ (overrides — wins on key collision)
 *
 * Later directories overwrite earlier ones for the same component key, so
 * consumer overrides are baked in. Call sites need only:
 *   import { components } from "virtual:mws-astro/components";
 */
export function componentRegistryPlugin(
  packageComponentDir: string,
  plugins: ComponentPlugin[] = [],
  overridesDir?: string,
): Plugin {
  const dirs = [
    packageComponentDir,
    ...plugins.map((p) => p.componentDir),
    ...(overridesDir ? [overridesDir] : []),
  ];

  return {
    name: "mws-astro:component-registry",

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id !== RESOLVED_ID) return;

      // Map ensures later directories silently overwrite earlier ones for the
      // same key — overrides win without producing duplicate object keys.
      const registry = new Map<string, string>(); // key → absPath
      for (const dir of dirs) {
        for (const absPath of findAstroFiles(dir)) {
          registry.set(toComponentKey(absPath), absPath);
        }
      }

      const importLines: string[] = [];
      const entryLines: string[] = [];
      let idx = 0;

      for (const [key, absPath] of registry) {
        this.addWatchFile(absPath);
        const varName = `__c${idx++}`;
        importLines.push(`import ${varName} from ${JSON.stringify(absPath)};`);
        entryLines.push(`  ${JSON.stringify(key)}: ${varName}`);
      }

      return [
        ...importLines,
        "",
        "export const components = {",
        entryLines.join(",\n"),
        "};",
      ].join("\n");
    },

    configureServer(server: ViteDevServer) {
      // Watch directories so new .astro files trigger a registry rebuild.
      // Existing file edits are handled by addWatchFile in load() above.
      server.watcher.setMaxListeners(20); // Supress memory leak warning
      for (const dir of dirs) {
        server.watcher.add(dir);
      }
      server.watcher.on("add", (file: string) => {
        if (file.endsWith(".astro") && dirs.some((d) => file.startsWith(d))) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.hot.send({ type: "full-reload" });
        }
      });
    },
  };
}
