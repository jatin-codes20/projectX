import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToLocal, uploadVideoToLocal } from '@/lib/imageUpload';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '@/lib/cloudinaryUpload';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Upload media file (image or video) endpoint
 * Tries Cloudinary first, falls back to local storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const isVideo = fileType === 'video' || file.type.startsWith('video/');
    const isImage = fileType === 'image' || file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { success: false, error: 'File must be an image or video' },
        { status: 400 }
      );
    }

    let uploadResult;

    // Try Cloudinary first if credentials are available
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      if (isVideo) {
        uploadResult = await uploadVideoToCloudinary(
          file,
          CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_API_KEY,
          CLOUDINARY_API_SECRET
        );
      } else {
        uploadResult = await uploadImageToCloudinary(
          file,
          CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_API_KEY,
          CLOUDINARY_API_SECRET
        );
      }

      if (uploadResult.success && uploadResult.url) {
        return NextResponse.json({
          success: true,
          url: uploadResult.url
        });
      }
    }

    // Fallback to local storage
    const localResult = isVideo 
      ? await uploadVideoToLocal(file)
      : await uploadImageToLocal(file);
      
    if (localResult.success && localResult.url) {
      const baseUrl = request.nextUrl.origin;
      return NextResponse.json({
        success: true,
        url: `${baseUrl}${localResult.url}`
      });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

