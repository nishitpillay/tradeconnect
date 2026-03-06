import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const root = process.cwd();
const candidates = ['.env.local', '.env', '.env.production', '.env.development'];

for (const file of candidates) {
  const fullPath = path.join(root, file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
  }
}

// Import after dotenv has populated process.env.
// This throws with clear validation errors when env is invalid.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('../src/config/env');

console.log('Web env validation passed.');
