import { FileSystem } from "../FileSystem";
export declare type FakeFileEntry = Readonly<{
    path: string;
    data: string;
}>;
export declare function fakeFileSystem(currentDirectory: string, initialFakeFileEntries: FakeFileEntry[]): FileSystem;
