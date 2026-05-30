import { mkdir, readdir, rm, copyFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

async function copyRecursive(source: string, destination: string) {
  const sourceStat = await stat(source);
  if (sourceStat.isDirectory()) {
    await mkdir(destination, { recursive: true });
    const entries = await readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      await copyRecursive(join(source, entry.name), join(destination, entry.name));
    }
    return;
  }
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

await rm("dist", { recursive: true, force: true });
await copyRecursive("docs", "dist");
console.log("documentation site built");
