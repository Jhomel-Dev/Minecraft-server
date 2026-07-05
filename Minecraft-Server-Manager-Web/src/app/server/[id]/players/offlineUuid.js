"use server";
import crypto from 'crypto';

export async function generateOfflineUUID(username) {
    const hash = crypto.createHash('md5').update("OfflinePlayer:" + username, 'utf8').digest('hex');
    const chars = hash.split('');
    chars[12] = '3';
    const variant = parseInt(chars[16], 16);
    chars[16] = ((variant & 0x3) | 0x8).toString(16);
    
    const uuid = chars.join('');
    return `${uuid.slice(0,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}-${uuid.slice(16,20)}-${uuid.slice(20)}`;
}
