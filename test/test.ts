import { FakeFileEntry, fakeFileSystem } from "./fakeFileSystem";
import { recheck } from "../index";

describe("henk", () => {
  it("henk", () => {
    const tsConfigJson: FakeFileEntry = {
      path: "/root/tsconfig.json",
      data: '{"compilerOptions": {"target": "es5"}, "include": "**/*.ts"}'
    };
    const onlyFile: FakeFileEntry = {
      path: "/root/test.ts",
      data: "const henk: string = 4"
    };
    const fileSystem = fakeFileSystem("/root", [tsConfigJson, onlyFile]);
    expect(recheck(fileSystem)("tsconfig.json", [])).toEqual(4);
  });
});
