export type FileSystem = Readonly<{
  getCurrentDirectory(): string;
  fileExists(path: string): boolean;
  readFile(path: string): string | undefined;
  readDirectory(
    rootDir: string,
    extensions: ReadonlyArray<string>,
    excludes: ReadonlyArray<string> | undefined,
    includes: ReadonlyArray<string>,
    depth?: number
  ): ReadonlyArray<string>;
  writeFile(path: string, data: string): void;
  createTemporaryDirectory(): string;
}>;
