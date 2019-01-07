import { FileSystem } from "../FileSystem";
import { isAbsolute, resolve } from "path";

export type FakeFileEntry = Readonly<{
  path: string;
  data: string;
}>;

export function fakeFileSystem(
  currentDirectory: string,
  initialFakeFileEntries: FakeFileEntry[]
): FileSystem {
  let temporaryDirectoryIndex = 0;
  // TODO MORE ABSOLUTE
  const fakeFileEntries: FakeFileEntry[] = [...initialFakeFileEntries];
  return {
    getCurrentDirectory() {
      return currentDirectory;
    },
    fileExists(path: string) {
      const absolutePath = isAbsolute(path)
        ? path
        : resolve(currentDirectory, path);
      const fakeFileEntry = fakeFileEntries.find(
        ffe => ffe.path === absolutePath
      );
      return fakeFileEntry !== undefined;
    },
    readFile(path: string) {
      const absolutePath = isAbsolute(path)
        ? path
        : resolve(currentDirectory, path);
      const fakeFileEntry = fakeFileEntries.find(
        ffe => ffe.path === absolutePath
      );
      return fakeFileEntry === undefined ? undefined : fakeFileEntry.data;
    },
    readDirectory() {
      return fakeFileEntries.map(ffe => ffe.path);
    },
    writeFile(path: string, data: string): void {
      fakeFileEntries.push({ path, data });
    },
    createTemporaryDirectory() {
      return "temporaryDirectory" + temporaryDirectoryIndex++;
    }
  };
}
