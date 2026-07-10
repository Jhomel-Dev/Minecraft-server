import fs from 'fs';
import { pipeline } from 'stream/promises';

export async function downloadFile(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download from ${url}: ${res.statusText}`);
    const fileStream = fs.createWriteStream(dest);
    await pipeline(res.body, fileStream);
}
