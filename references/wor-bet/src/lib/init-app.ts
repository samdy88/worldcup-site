import { initDB } from './db';
import { seedData } from './seed';

let initialized = false;

export function ensureInitialized(): void {
  if (!initialized) {
    initDB();
    seedData();
    initialized = true;
  }
}
