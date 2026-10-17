import {db} from '../src/models/index.js';
// Initial schema creation only. No destructive force/alter synchronization.
await db.authenticate();await db.sync();console.log('Initial BuildStock schema is ready.');await db.close();
