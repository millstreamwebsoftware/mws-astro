import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

const PARSE_STRUCTURE_VALUE = false;
const PARSE_BOOKSHOP = true;

const rootPath = process.cwd();

if (!fs.readdir(rootPath).then((f) => f.includes("astro.config.mjs"))) {
  throw Error(`Astro config file could not be found in cwd ${rootPath}`);
}

// const buildPath = path.join(rootPath, "dist");
const buildPath = rootPath;
var ccInfoPath: string;

for await (const file of fs.glob("./**/_cloudcannon/info.json")) {
  console.log(
    `[Cloudcannon API Connector] Located _cloudcannon/info.json at ${file}`,
  );
  ccInfoPath ??= file;
}

ccInfoPath ??= "";

if (!ccInfoPath.length)
  throw Error(
    `Could not locate _cloudcannon/info.json, is this running on CloudCannon?`,
  );

// ccInfoPath ??= path.join(buildPath, "_cloudcannon/info.json");

const ccJson: Record<string, any> = await fs.readFile(ccInfoPath).then(
  (c) => JSON.parse(c.toString()),
  () => ({ _structures: { content_blocks: { values: [] } } }),
);

ccJson._structures ?? (ccJson._structures = {});
ccJson._structures.content_blocks ?? (ccJson._structures.content_blocks = {});
ccJson._structures.content_blocks.values ??
  (ccJson._structures.content_blocks.values = []);

if (PARSE_STRUCTURE_VALUE)
  for await (const file of fs.glob("**/*.cloudcannon.structure-value.*")) {
    var entry: any;
    const structures = [];
    const f = (await fs.readFile(file)).toString();
    const l1 = f.split("\n")[0];

    switch (true) {
      case file.endsWith(".yml"):
      case file.endsWith(".yaml"):
        entry = yaml.load(f);
        if (l1.startsWith("#!")) {
          structures.push(
            ...l1
              .substring(2)
              .split(",")
              .map((s) => s.trim()),
          );
        }
        break;
      case file.endsWith(".json"):
        entry = JSON.parse(f);
        break;
      default:
        console.warn(`No parser for file ${file}`);
        continue;
    }

    if (!structures.length) structures.push("content_blocks");

    for (const structure of structures) {
      if (!entry?.value?._bookshop_name)
        entry.value._bookshop_name = path.basename(file).split(".")[0];

      if (typeof ccJson._structures[structure] === "undefined")
        ccJson._structures[structure] = { values: [] };
      ccJson._structures[structure].values.push(entry);

      console.log(
        `[Cloudcannon API Connector] Added structure value ${entry.value._bookshop_name} to ${structure}.`,
      );
    }
  }

if (PARSE_BOOKSHOP)
  for await (const file of fs.glob("**/*.bookshop.*")) {
    var entry: any;
    const structures = [];
    const f = (await fs.readFile(file)).toString();
    const componentName = fileToComponentName(file);

    switch (true) {
      case file.endsWith(".yml"):
      case file.endsWith(".yaml"):
        entry = yaml.load(f);
        break;
      case file.endsWith(".json"):
        entry = JSON.parse(f);
        break;
      default:
        console.warn(`No parser for file ${file}`);
        continue;
    }

    if (typeof entry.spec === "undefined") {
      console.warn(`Spec undefined in ${file}`);
      continue;
    }

    if (entry.spec?.structures.length)
      structures.push(...entry.spec.structures);
    else structures.push("content_blocks");

    let { structures: _1, description, ...spec } = entry.spec;
    let { spec: _2, blueprint, ...bookshop } = entry;

    const componentStructure = {
      ...spec,
      picker_preview: { subtext: entry.spec?.description },
      value: blueprint ?? {},
      ...bookshop,
    };

    componentStructure.value._bookshop_name = componentName;

    for (const structure of structures) {
      if (typeof ccJson._structures[structure] === "undefined")
        ccJson._structures[structure] = { values: [] };
      ccJson._structures[structure].values.push(componentStructure);

      console.log(
        `[Cloudcannon API Connector] Added bookshop component ${componentName} to ${structure}.`,
      );
    }
  }

await fs.mkdir(path.dirname(ccInfoPath), { recursive: true }).then(
  () => fs.writeFile(ccInfoPath, JSON.stringify(ccJson, undefined, 4)),
  () => console.error(`Failed to create directory for ${relpath(ccInfoPath)}.`),
);

console.log(`[Cloudcannon API Connector] Modified ${relpath(ccInfoPath)}!`);

function relpath(p: string) {
  return path.relative(".", p);
}

function fileToComponentName(file: string) {
  var componentName = file.split("components").at(-1) || path.basename(file);

  componentName = componentName.substring(1, componentName.indexOf("."));
  const componentNameChunks = componentName.split("/");
  if (
    componentNameChunks.length &&
    componentNameChunks.at(-1) === componentNameChunks.at(-2)
  )
    componentName = componentNameChunks.slice(0, -1).join("/");

  return componentName;
}
