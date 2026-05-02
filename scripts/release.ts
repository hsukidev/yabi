// Release script: rolls pending `.changes/*.md` files into a new entry in
// src/data/changelog.ts, bumps package.json, deletes the changeset files,
// then commits and tags. Run as `pnpm release`. See docs/RELEASING.md.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const changesDir = join(repoRoot, '.changes');
const changelogPath = join(repoRoot, 'src/data/changelog.ts');
const packageJsonPath = join(repoRoot, 'package.json');

type Bump = 'patch' | 'minor' | 'major';
const BUMP_RANK: Record<Bump, number> = { patch: 0, minor: 1, major: 2 };

type Changeset = { file: string; bump: Bump; summary: string };

async function main(): Promise<void> {
  assertWorkingTreeClean();

  const changesets = await loadChangesets();
  if (changesets.length === 0) {
    console.error('No pending changesets in .changes/. Nothing to release.');
    process.exit(1);
  }

  const currentVersion = await readCurrentVersion();
  const maxBump = changesets.reduce<Bump>(
    (acc, c) => (BUMP_RANK[c.bump] > BUMP_RANK[acc] ? c.bump : acc),
    'patch',
  );
  const proposedVersion = bumpVersion(currentVersion, maxBump);

  console.log(`\nFound ${changesets.length} pending changeset${plural(changesets.length)}:`);
  for (const cs of changesets) {
    console.log(`  [${cs.bump}] ${cs.summary}`);
  }
  console.log();
  console.log(`Current version:   ${currentVersion}`);
  console.log(`Proposed version:  ${proposedVersion}  (max bump = ${maxBump})`);
  console.log();

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const versionAnswer = (
      await rl.question('Override? [Enter to accept, or type x.y.z]: ')
    ).trim();
    const version = versionAnswer === '' ? proposedVersion : versionAnswer;
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      console.error(`Invalid version: ${version}`);
      process.exit(1);
    }

    const headline = (await rl.question('Headline (optional, one sentence): ')).trim();
    const today = new Date().toISOString().slice(0, 10);

    console.log(`Date: ${today} (auto, UTC)`);
    console.log();
    console.log('About to write:');
    console.log('  - src/data/changelog.ts        (prepend new release entry)');
    console.log(`  - package.json                 (${currentVersion} → ${version})`);
    console.log(
      `  - .changes/*.md                (delete ${changesets.length} file${plural(changesets.length)})`,
    );
    console.log();

    const confirm = (await rl.question(`Commit + tag as v${version}? [Y/n]: `))
      .trim()
      .toLowerCase();
    if (confirm === 'n' || confirm === 'no') {
      console.log('Aborted.');
      process.exit(0);
    }

    rl.close();

    await writeChangelog(version, today, headline || undefined, changesets);
    console.log('✓ Wrote changelog entry');

    await writePackageVersion(version);
    console.log(`✓ Bumped package.json to ${version}`);

    for (const cs of changesets) {
      await unlink(cs.file);
    }
    console.log(`✓ Removed ${changesets.length} changeset file${plural(changesets.length)}`);

    try {
      execGit(['add', 'src/data/changelog.ts', 'package.json', '.changes/']);
      execGit(['commit', '-m', `release: v${version}`]);
      console.log(`✓ Committed: "release: v${version}"`);

      execGit(['tag', `v${version}`]);
      console.log(`✓ Tagged: v${version}`);
    } catch {
      console.error('\nCommit or tag failed. To recover:');
      console.error('  git restore --staged .');
      console.error('  git checkout -- src/data/changelog.ts package.json');
      console.error('  git checkout -- .changes/');
      process.exit(1);
    }

    console.log();
    console.log('Next: push and deploy.');
    console.log('   git push --follow-tags');
    console.log('   pnpm deploy:prod');
  } finally {
    rl.close();
  }
}

function assertWorkingTreeClean(): void {
  const out = execFileSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const dirty = out
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => line.slice(3))
    .filter((path) => !path.startsWith('.changes/'));
  if (dirty.length > 0) {
    console.error('Working tree is dirty outside .changes/. Commit or stash first:');
    for (const p of dirty) console.error(`  ${p}`);
    process.exit(1);
  }
}

async function loadChangesets(): Promise<Changeset[]> {
  if (!existsSync(changesDir)) return [];
  const entries = await readdir(changesDir);
  const files = entries.filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
  const results: Changeset[] = [];
  for (const f of files) {
    const fullPath = join(changesDir, f);
    const raw = await readFile(fullPath, 'utf8');
    const parsed = parseChangeset(raw, f);
    results.push({ file: fullPath, ...parsed });
  }
  return results;
}

function parseChangeset(raw: string, filename: string): { bump: Bump; summary: string } {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filename}: missing frontmatter (--- bump: x ---)`);
  }
  const [, frontmatter, body] = match;
  const bumpMatch = frontmatter.match(/^bump:\s*(patch|minor|major)\s*$/m);
  if (!bumpMatch) {
    throw new Error(`${filename}: frontmatter must have "bump: patch|minor|major"`);
  }
  const summary = body
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
  if (!summary) {
    throw new Error(`${filename}: body is empty (must have a one-line summary)`);
  }
  return { bump: bumpMatch[1] as Bump, summary };
}

async function readCurrentVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
}

function bumpVersion(current: string, bump: Bump): string {
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Invalid current version in package.json: ${current}`);
  let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

async function writeChangelog(
  version: string,
  date: string,
  headline: string | undefined,
  changesets: Changeset[],
): Promise<void> {
  const current = await readFile(changelogPath, 'utf8');
  const marker = 'export const releases: Release[] = [';
  const idx = current.indexOf(marker);
  if (idx === -1) {
    throw new Error(`Could not find marker "${marker}" in ${changelogPath}`);
  }
  const insertAt = idx + marker.length;

  const lines: string[] = [''];
  lines.push('  {');
  lines.push(`    date: '${date}',`);
  lines.push(`    version: '${version}',`);
  if (headline) {
    lines.push(`    headline: '${escapeSingle(headline)}',`);
  }
  if (changesets.length === 1) {
    lines.push(`    changes: ['${escapeSingle(changesets[0].summary)}'],`);
  } else {
    lines.push('    changes: [');
    for (const cs of changesets) {
      lines.push(`      '${escapeSingle(cs.summary)}',`);
    }
    lines.push('    ],');
  }
  lines.push('  },');

  const insertion = lines.join('\n');
  const next = current.slice(0, insertAt) + insertion + current.slice(insertAt);
  await writeFile(changelogPath, next, 'utf8');
}

async function writePackageVersion(version: string): Promise<void> {
  const raw = await readFile(packageJsonPath, 'utf8');
  const updated = raw.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`);
  if (updated === raw) {
    throw new Error(`Could not find version field in ${packageJsonPath}`);
  }
  await writeFile(packageJsonPath, updated, 'utf8');
}

function escapeSingle(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function plural(n: number): string {
  return n === 1 ? '' : 's';
}

function execGit(args: string[]): void {
  execFileSync('git', args, { cwd: repoRoot, stdio: 'inherit' });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
