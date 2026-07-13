import crypto from 'crypto';
import fs from 'fs';

export function verifyFileChecksum(filePath, expectedHash) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    
    stream.on('end', () => {
      const calculatedHash = hash.digest('hex');
      if (calculatedHash !== expectedHash) {
        reject(new Error(`Checksum mismatch! Expected ${expectedHash}, got ${calculatedHash}`));
      } else {
        resolve(true);
      }
    });
  });
}
