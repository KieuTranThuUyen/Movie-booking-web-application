import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const CLOUDINARY_FOLDER = 'comments';
const allowedTypes = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
]);
function configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret)
        throw new Error('Chưa cấu hình Cloudinary để lưu ảnh bình luận.');
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}
async function uploadToCloudinary(file: File): Promise<string> {
    configureCloudinary();
    const buffer = Buffer.from(await file.arrayBuffer());
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream({
            folder: CLOUDINARY_FOLDER,
            resource_type: 'image',
        }, (error, result) => {
            if (error || !result?.secure_url) {
                reject(error instanceof Error ? error : new Error('Không thể tải ảnh lên Cloudinary.'));
                return;
            }
            resolve(result.secure_url);
        });
        upload.end(buffer);
    });
}
export async function saveCommentImage(file: File | null): Promise<string | null> {
    if (!file || file.size === 0)
        return null;
    const extension = allowedTypes.get(file.type);
    if (!extension || file.size > MAX_IMAGE_SIZE) {
        throw new Error('Ảnh phải là JPG, PNG hoặc WEBP và không vượt quá 5MB.');
    }
    return uploadToCloudinary(file);
}
export async function saveCommentImages(files: File[]): Promise<string[]> {
    const saved: string[] = [];
    try {
        for (const file of files) {
            const imageUrl = await saveCommentImage(file);
            if (imageUrl)
                saved.push(imageUrl);
        }
        return saved;
    }
    catch (error) {
        await removeCommentImages(saved);
        throw error;
    }
}
export function parseCommentImages(value: string | null | undefined): string[] {
    if (!value)
        return [];
    try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string'))
            return parsed;
    }
    catch {
        
    }
    return [value];
}
export function serializeCommentImages(images: string[]) {
    return images.length ? JSON.stringify(images) : null;
}
export async function removeCommentImage(imageUrl: string | null | undefined) {
    if (!imageUrl)
        return;
    if (imageUrl.startsWith('/uploads/comments/')) {
        await unlink(path.join(process.cwd(), 'public', imageUrl.slice(1))).catch(() => undefined);
        return;
    }
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(imageUrl);
    }
    catch {
        return;
    }
    if (!parsedUrl.hostname.endsWith('res.cloudinary.com') || !parsedUrl.pathname.includes('/image/upload/'))
        return;
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');
    if (uploadIndex < 0)
        return;
    const publicIdSegments = segments.slice(uploadIndex + 1).filter((segment, index) => !(index === 0 && /^v\d+$/.test(segment)));
    const lastSegment = publicIdSegments.pop();
    if (!lastSegment)
        return;
    publicIdSegments.push(lastSegment.replace(/\.[^.]+$/, ''));
    configureCloudinary();
    const result = await cloudinary.uploader.destroy(publicIdSegments.join('/'), { resource_type: 'image' });
    if (result.result !== 'ok' && result.result !== 'not found')
        throw new Error('Không thể xóa ảnh khỏi Cloudinary.');
}
export async function removeCommentImages(imageUrls: string[]) {
    await Promise.all(imageUrls.map((imageUrl) => removeCommentImage(imageUrl)));
}
