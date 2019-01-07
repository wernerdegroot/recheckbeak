import * as ts from "typescript";
import * as path from "path";
import { FileSystem } from "./FileSystem";
import { defaultFileSystem } from "./defaultFileSystem";

type Substitute = Readonly<{
  fromPath: string;
  toPath: string;
}>;

function getPreTransformParseConfigHost(
  fileSystem: FileSystem
): ts.ParseConfigHost {
  return {
    fileExists: fileSystem.fileExists,
    readFile: fileSystem.readFile,
    readDirectory: fileSystem.readDirectory,
    useCaseSensitiveFileNames: true
  };
}

function getPostTransformParseConfigHost(
  fileSystem: FileSystem,
  substitutes: Substitute[]
): ts.ParseConfigHost {
  return {
    fileExists(path: string): boolean {
      const substitute = substitutes.find(s => s.fromPath === path);
      if (substitute === undefined) {
        return fileSystem.fileExists(path);
      } else {
        return true;
      }
    },
    readFile(path: string): string | undefined {
      const substitute = substitutes.find(s => s.fromPath === path);
      const pathOrSubstitutePath =
        substitute === undefined ? path : substitute.toPath;
      return fileSystem.readFile(pathOrSubstitutePath);
    },
    readDirectory(): ReadonlyArray<string> {
      return substitutes.map(s => s.fromPath);
    },
    useCaseSensitiveFileNames: true
  };
}

export const recheck = (fileSystem: FileSystem) => (
  tsConfigFileName: string,
  transformers: ts.TransformerFactory<ts.SourceFile>[]
): string[] => {
  // Create a `FormatDiagnosticHost` which will be used to format diagnostics.
  // Because it is used so much, create it this early.
  const defaultFormatHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: fileSystem.getCurrentDirectory,
    getCanonicalFileName: fileName => fileName,
    getNewLine: () => ts.sys.newLine
  };

  // Check if the `tsconfig.json` exists:
  if (!fileSystem.fileExists(tsConfigFileName)) {
    return [`Configuration file ${tsConfigFileName} does not exist.`];
  }

  // Read the `tsconfig.json`, and report any errors that occur:
  const tsConfigFileContents = ts.readConfigFile(
    tsConfigFileName,
    fileSystem.readFile
  );

  if (tsConfigFileContents.error !== undefined) {
    return [
      ts.formatDiagnosticsWithColorAndContext(
        [tsConfigFileContents.error],
        defaultFormatHost
      )
    ];
  }

  // Check where the `tsconfig.json` is located. Paths should be relative to that:
  const tsConfigRootDirectory = path.dirname(tsConfigFileName);

  // Create a `ParseConfigHost`:
  const preTransformParseConfigHost = getPreTransformParseConfigHost(
    fileSystem
  );

  // Actually parse the `tsconfig.json`, and report any errors that occur:
  const preTransformParsedCommandLine = ts.parseJsonConfigFileContent(
    tsConfigFileContents.config,
    preTransformParseConfigHost,
    tsConfigRootDirectory
  );

  if (preTransformParsedCommandLine.errors.length > 0) {
    return [
      ts.formatDiagnosticsWithColorAndContext(
        preTransformParsedCommandLine.errors,
        defaultFormatHost
      )
    ];
  }

  // Create a temporary directory in which to store the transformed files:
  const temporaryDirectoryPath = fileSystem.createTemporaryDirectory();

  const substitutes: Substitute[] = [];
  const errors: string[] = [];

  // Create a printer, which will be used to print the transformed files:
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed
  });

  // Loop over all files in the project. Transform each, and write
  // the result to the temporary directory as a .ts-file.
  preTransformParsedCommandLine.fileNames.forEach(fileName => {
    // Read the file:
    const fileContents = fileSystem.readFile(fileName);

    // Skip the file if the file could not be read:
    if (fileContents === undefined) {
      return;
    }

    // Create a `SourceFile` with the contents:
    const sourceFile = ts.createSourceFile(
      fileName,
      fileContents,
      ts.ScriptTarget.Latest
    );

    // Transform the contents of the file, and report any errors that occur:
    const transformed = ts.transform(
      sourceFile,
      transformers,
      preTransformParsedCommandLine.options
    );

    if (transformed.diagnostics !== undefined) {
      errors.push(
        ts.formatDiagnosticsWithColorAndContext(
          transformed.diagnostics,
          defaultFormatHost
        )
      );
    }

    // A single source file could result in multiple transformed source files.
    // Write each of these to the temporary directoy.
    transformed.transformed.forEach(tr => {
      // Get the transformed contents of the file:
      const printed = printer.printFile(tr);

      // Gather all the relevant path names:
      const absolutePathName = tr.fileName;
      const relativePathName = path.relative(
        tsConfigRootDirectory,
        absolutePathName
      );
      const absoluteTemporaryPathName = path.resolve(
        temporaryDirectoryPath,
        relativePathName
      );
      substitutes.push({
        fromPath: absolutePathName,
        toPath: absoluteTemporaryPathName
      });

      fileSystem.writeFile(absoluteTemporaryPathName, printed);
    });
  });

  // Create another `ParseConfigHost`:
  const postTransformParseConfigHost = getPostTransformParseConfigHost(
    fileSystem,
    substitutes
  );

  // Parse the `tsconfig.json` again:
  const postTransformParsedCommandLine = ts.parseJsonConfigFileContent(
    tsConfigFileContents.config,
    postTransformParseConfigHost,
    tsConfigRootDirectory
  );

  const compilerHost = ts.createCompilerHost(
    postTransformParsedCommandLine.options
  );

  const program = ts.createProgram(
    postTransformParsedCommandLine.fileNames,
    postTransformParsedCommandLine.options,
    compilerHost
  );

  let allDiagnostics = program
    .getSemanticDiagnostics()
    .concat(program.getSyntacticDiagnostics());

  return [
    ts.formatDiagnosticsWithColorAndContext(allDiagnostics, defaultFormatHost)
  ];
};

console.error(...recheck(defaultFileSystem)(process.argv[2], []));
