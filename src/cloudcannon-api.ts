import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

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

ccInfoPath ??= path.join(buildPath, "_cloudcannon/info.json");

const ccJson: Record<string, any> = await fs.readFile(ccInfoPath).then(
  (c) => JSON.parse(c.toString()),
  () => ({ _structures: { content_blocks: { values: [] } } }),
);

ccJson._structures ?? (ccJson._structures = {});
ccJson._structures.content_blocks ?? (ccJson._structures.content_blocks = {});
ccJson._structures.content_blocks.values ??
  (ccJson._structures.content_blocks.values = []);

for await (const file of fs.glob("**/*.cloudcannon.*.*")) {
  var entry: any;

  switch (true) {
    case file.endsWith(".yml"):
    case file.endsWith(".yaml"):
      entry = yaml.load((await fs.readFile(file)).toString());
      break;
    case file.endsWith(".json"):
      entry = JSON.parse((await fs.readFile(file)).toString());
      break;
    default:
      console.warn(`No parser for file ${file}`);
      continue;
  }
  // console.log(`[Cloudcannon API Connector] Read ${file}.`);

  if (!entry?.value?._bookshop_name)
    entry.value._bookshop_name = path.basename(file).split(".")[0];

  ccJson._structures.content_blocks.values.push(entry);

  console.log(
    `[Cloudcannon API Connector] Added structure value ${entry.value._bookshop_name} to content_blocks.`,
  );
}

ccJson._structures.content_blocks.label = "Content Blocks - API Test";

await fs.mkdir(path.dirname(ccInfoPath), { recursive: true }).then(
  () => fs.writeFile(ccInfoPath, JSON.stringify(ccJson, undefined, 4)),
  () => console.error(`Failed to create directory for ${relpath(ccInfoPath)}.`),
);

console.log(`[Cloudcannon API Connector] Modified ${relpath(ccInfoPath)}!`);

function relpath(p: string) {
  return path.relative(".", p);
}
