import { validateConfig, config } from './src/config/env.js';
import { db } from './src/models/index.js';
import app from './src/app.js';
validateConfig();await db.authenticate();
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`BuildStock listening on port ${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(async()=>{await db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
