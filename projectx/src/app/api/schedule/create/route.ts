import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { uploadImageToLocal } from '@/lib/imageUpload';
import { uploadImageToCloudinary } from '@/lib/cloudinaryUpload';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Proxy route for creating scheduled posts - forwards to Java backend
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const platforms = formData.get('platforms') as string;
    const scheduledTime = formData.get('scheduledTime') as string;
    const image = formData.get('image') as File;

    if (!content || !platforms || !scheduledTime) {
      return NextResponse.json(
        { error: 'Content, platforms, and scheduled time are required' },
        { status: 400 }
      );
    }

    // Handle image upload if present
    let imageUrl: string | undefined;
    if (image) {
      try {
        // Try Cloudinary first if credentials are available
        if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
          const uploadResult = await uploadImageToCloudinary(
            image,
            CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_API_KEY,
            CLOUDINARY_API_SECRET
          );

          if (uploadResult.success) {
            imageUrl = uploadResult.url!;
          } else {
            // Fallback to local storage
            const localResult = await uploadImageToLocal(image);
            if (localResult.success) {
              const baseUrl = request.nextUrl.origin;
              imageUrl = `${baseUrl}${localResult.url}`;
            }
          }
        } else {
          // Fallback to local storage
          const uploadResult = await uploadImageToLocal(image);
          if (uploadResult.success) {
            const baseUrl = request.nextUrl.origin;
            imageUrl = `${baseUrl}${uploadResult.url}`;
          }
        }
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue without image - image is optional for scheduled posts
      }
    }

    const platformArray = JSON.parse(platforms) as string[];
    // Convert 'twitter' to 'x' for backend
    const normalizedPlatforms = platformArray.map(p => p === 'twitter' ? 'x' : p);
    
    // Parse the scheduled time and format it as LocalDateTime string (YYYY-MM-DDTHH:mm:ss)
    // This preserves the local time without timezone conversion
    const scheduledDate = new Date(scheduledTime);
    const year = scheduledDate.getFullYear();
    const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
    const day = String(scheduledDate.getDate()).padStart(2, '0');
    const hours = String(scheduledDate.getHours()).padStart(2, '0');
    const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
    const seconds = String(scheduledDate.getSeconds()).padStart(2, '0');
    const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    
    // Forward to Java backend
    const javaResponse = await fetch('http://localhost:8080/auth/api/scheduled-posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        platforms: normalizedPlatforms,
        scheduledTime: localDateTimeString,
        imageUrl: imageUrl || null,
      }),
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}`, details: errorData },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    return NextResponse.json({
      success: true,
      post: data,
      message: `Post scheduled for ${scheduledDate.toLocaleString()}`
    });

  } catch (error) {
    console.error('Error creating scheduled post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scheduled post' },
      { status: 500 }
    );
  }
}
