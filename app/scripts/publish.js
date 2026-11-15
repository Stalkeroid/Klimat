// Копіює зібраний сайт (app/dist) у корінь репозиторію, звідки його роздає GitHub Pages.
// Старі файли assets/ видаляються, щоб не накопичувались (імена містять хеш — кеш браузера оновлюється сам).
import { cpSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '..');
const dist = resolve(app, 'dist');

if (existsSync(resolve(root, 'assets'))) rmSync(resolve(root, 'assets'), { recursive: true });
cpSync(resolve(dist, 'assets'), resolve(root, 'assets'), { recursive: true });
cpSync(resolve(dist, 'index.html'), resolve(root, 'index.html'));
console.log('published to', root);
