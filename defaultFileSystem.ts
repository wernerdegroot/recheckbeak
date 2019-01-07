import { FileSystem } from "./FileSystem";
import * as ts from "typescript";
import { dirname } from "path";
import { mkdirSync } from "mkdir-recursive";
import { dirSync } from "tmp";

export const defaultFileSystem: FileSystem = {
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  writeFile(path: string, data: string): void {
    // Write the file to disk, making sure that the path exists:
    const dirnameOfPath = dirname(path);
    mkdirSync(dirnameOfPath);
    ts.sys.writeFile(path, data);
  },
  createTemporaryDirectory() {
    return dirSync({ unsafeCleanup: true }).name;
  }
};
