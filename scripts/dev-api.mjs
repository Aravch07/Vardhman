import { createServer } from 'node:http';
import handler from '../server/handler.js';

createServer(handler).listen(3001, '127.0.0.1', () => console.log('Dealer API ready on port 3001.'));
