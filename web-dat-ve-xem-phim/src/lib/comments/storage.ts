import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
]);
export async function saveCommentImage(file: File | null): Promise<string | null> {
    if (!file || file.size === 0)
        return null;
    const extension = allowedTypes.get(file.type);
    if (!extension || file.size > MAX_IMAGE_SIZE) {
        throw new Error('Ảnh phải là JPG, PNG hoặc WEBP và không vượt quá 5MB.');
    }
    const directory = path.join(process.cwd(), 'public', 'uploads', 'comments');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
    return `/uploads/comments/${filename}`;
}
export async function saveCommentImages(files: File[]): Promise<string[]> {
    const saved: string[] = [];
    for (const file of files) {
        const imageUrl = await saveCommentImage(file);
        if (imageUrl)
            saved.push(imageUrl);
    }
    return saved;
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
    if (!imageUrl?.startsWith('/uploads/comments/'))
        return;
    await unlink(path.join(process.cwd(), 'public', imageUrl.slice(1))).catch(() => undefined);
}
export async function removeCommentImages(imageUrls: string[]) {
    await Promise.all(imageUrls.map((imageUrl) => removeCommentImage(imageUrl)));
}
