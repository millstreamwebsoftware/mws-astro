import fs from "node:fs/promises";
import path from "node:path";

const rootPath = process.cwd();

if (!fs.readdir(rootPath).then((f) => f.includes("astro.config.mjs"))) {
  throw Error(`Astro config file could not be found in cwd ${rootPath}`);
}

const buildPath = path.join(rootPath, "dist");
const ccInfoPath = path.join(buildPath, "_cloudcannon/info.json");

if (
  !(await fs.stat(ccInfoPath).then(
    () => true,
    () => false,
  ))
) {
  throw Error(`${ccInfoPath} did not exist...`);
}

const ccInfo = (await fs.readFile(ccInfoPath)).toString();
const ccJson = JSON.parse(ccInfo);

ccJson._structures.content_blocks.label = "Content Blocks - API Test";

await fs.writeFile(ccInfoPath, JSON.stringify(ccJson));

console.log(`[Cloudcannon API Connector] Modified ${ccInfoPath}!`);
