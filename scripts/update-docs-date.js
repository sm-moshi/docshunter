// scripts/update-docs-date.js
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const files = [
  path.join(path.dirname(new URL(import.meta.url).pathname), '../docs/best_practices.md'),
  path.join(path.dirname(new URL(import.meta.url).pathname), '../docs/dependencies.md'),
];

const date = execSync('date').toString().trim();
const lastUpdatedLine = `_Last updated: ${date}_`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /_Last updated:.*_/,
    lastUpdatedLine
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated: ${file}`);
}
