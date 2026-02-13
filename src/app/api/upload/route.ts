import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        console.log('API UPLOAD: Received request, file:', file ? `${file.name} (${file.size} bytes)` : 'NULL');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const extension = file.name.split('.').pop();
        const filename = `${uuidv4()}.${extension}`;

        // Ensure uploads directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const path = join(uploadDir, filename);
        await writeFile(path, buffer);

        const url = `/uploads/${filename}`;
        console.log('API UPLOAD: Success, saved to:', path, 'URL:', url);

        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
