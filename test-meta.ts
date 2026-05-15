import path from 'path';
console.log('import.meta.dirname:', import.meta.dirname);
console.log('path.resolve(import.meta.dirname, "src"):', path.resolve(import.meta.dirname || '', 'src'));
