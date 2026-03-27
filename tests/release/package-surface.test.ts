import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = '/Users/ziho/Desktop/ziho_dev/clawcrew';

describe('package release surface', () => {
  it('ships config and examples in the package files list', () => {
    const pkg = readJson(resolve(ROOT, 'package.json')) as { files?: string[] };
    expect(pkg.files).toContain('config');
    expect(pkg.files).toContain('examples');
  });

  it('published docs use shipped commands instead of tsx source paths', () => {
    const docs = [
      readText(resolve(ROOT, 'README.md')),
      readText(resolve(ROOT, 'examples/README.md')),
      readText(resolve(ROOT, 'examples/local-review.md')),
      readText(resolve(ROOT, 'examples/github-webhook.md')),
      readText(resolve(ROOT, 'examples/slack-steering.md')),
    ].join('\n');

    expect(docs).toContain('clawcrew run');
    expect(docs).toContain('clawcrew webhook github');
    expect(docs).not.toContain('npx tsx src/cli.ts');
  });
});

function readText(path: string): string {
  return readFileSync(path, 'utf-8');
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path));
}
