import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
    request: NextRequest,
    context: any
) {
    try {
        // Handle both Promise and synchronous context depending on Next.js version
        const params = await context.params;
        const filename = params.filename;

        const filePath = join(process.cwd(), 'public', 'uploads', filename);

        if (!existsSync(filePath)) {
            console.error(`FORCED SERVE: File not found at ${filePath}`);
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        const extension = filename.split('.').pop()?.toLowerCase();

        const contentTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp'
        };

        const contentType = contentTypes[extension || ''] || 'application/octet-stream';

        console.log(`FORCED SERVE: Serving ${filename} as ${contentType}`);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error: any) {
        console.error('FORCED SERVE error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
