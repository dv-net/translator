import fs from 'fs-extra';
import path from 'path';

export async function resolveDir(options, sourceFile = null) {
  if (!options.dir) {
    throw new Error('Specify a directory with --dir <path>');
  }

  const dir = path.resolve(process.cwd(), options.dir);

  if (!await fs.pathExists(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  const stat = await fs.stat(dir);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${dir}`);
  }

  if (sourceFile) {
    const sourcePath = path.join(dir, sourceFile);
    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`${sourceFile} not found in directory: ${dir}`);
    }
  }

  return dir;
}
