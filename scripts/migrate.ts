import fs from 'node:fs/promises';
import {db} from '../src/lib/db';
await db().query(await fs.readFile('migrations/001_core.sql','utf8'));await db().end();console.log('Migration complete');
