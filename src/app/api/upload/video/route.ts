import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with .env.local variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Only allow POST; other methods will get a 405 automatically
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided or invalid file.' }, { status: 400 });
    }
    // Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    // Upload to Cloudinary via upload_stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'lessons',
          chunk_size: 6000000,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
    return NextResponse.json({
      success: true,
      url: (result as any).secure_url,
      public_id: (result as any).public_id,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json({ error: 'Upload failed', details: String(error) }, { status: 500 });
  }
}
