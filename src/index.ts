import express from "express";
import { lstatSync, readdirSync } from "fs";
import { join as p_join } from "path";
import "dotenv/config";

const ROUTES = p_join(__dirname, "routes");

const app = express();
app.use(express.json());

const PORT = 3008;

function isDir(path: string) {
  try {
    var stat = lstatSync(path);
    return stat.isDirectory();
  } catch (e) {
    console.error(e);
    return false;
  }
}

function loadFile(path: string) {
  let webPath = path.replace(".js", "").replace("index", "");
  console.log("[API]", webPath);
  return new Promise<void>((resolve, reject) => {
    import(p_join(ROUTES, path)).then((module) => {
      if (module.USE) app.use(webPath, module.USE);
      if (module.GET) app.get(webPath, module.GET);
      if (module.POST) app.post(webPath, module.POST);
      if (module.DELETE) app.delete(webPath, module.DELETE);
      if (module.PUT) app.put(webPath, module.PUT);
      if (module.PATCH) app.patch(webPath, module.PATCH);
      resolve();
    });
  });
}

async function loopPath(path: string) {
  let dirs = readdirSync(p_join(ROUTES, path));
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    if (isDir(p_join(ROUTES, path, dir))) await loopPath(path + dir + "/");
    else await loadFile(p_join(path + dir));
  }
}

async function main() {
  await loopPath("/");

  app.listen(PORT, () => {
    console.log("Listening on port", PORT);
  });
}

main();
