import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { uploadImageToLocal, uploadVideoToLocal } from '@/lib/imageUpload';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '@/lib/cloudinaryUpload';

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
    
    // Get all media files (can be images or videos)
    const mediaFiles: File[] = [];
    const formDataEntries = Array.from(formData.entries());
    
    for (const [key, value] of formDataEntries) {
      // Check if value is a File-like object (FormData entries from Next.js are File objects)
      // File extends Blob, so check for Blob properties
      const isFile = value && 
                     typeof value === 'object' && 
                     'size' in value && 
                     'type' in value && 
                     'name' in value &&
                     typeof (value as any).arrayBuffer === 'function';
      
      if ((key === 'image' || key === 'video' || key.startsWith('media')) && isFile) {
        mediaFiles.push(value as File);
      }
    }

    if (!content || !platforms || !scheduledTime) {
      return NextResponse.json(
        { error: 'Content, platforms, and scheduled time are required' },
        { status: 400 }
      );
    }

    // Handle multiple media file uploads
    const mediaUrls: string[] = [];
    
    for (const file of mediaFiles) {
      try {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        
        if (!isVideo && !isImage) {
          console.warn(`Skipping file ${file.name} - unsupported type: ${file.type}`);
          continue;
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
            mediaUrls.push(uploadResult.url);
            console.log(`${isVideo ? 'Video' : 'Image'} uploaded to Cloudinary:`, uploadResult.url);
            continue;
          } else {
            console.log(`Cloudinary ${isVideo ? 'video' : 'image'} upload failed, falling back to local storage`);
          }
        }

        // Fallback to local storage
        const localResult = isVideo 
          ? await uploadVideoToLocal(file)
          : await uploadImageToLocal(file);
          
        if (localResult.success && localResult.url) {
          const baseUrl = request.nextUrl.origin;
          mediaUrls.push(`${baseUrl}${localResult.url}`);
          console.log(`${isVideo ? 'Video' : 'Image'} uploaded to local storage:`, localResult.url);
        }
      } catch (uploadError) {
        console.error(`Error uploading ${file.name}:`, uploadError);
        // Continue with other files - media is optional for scheduled posts
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
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/scheduled-posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        platforms: normalizedPlatforms,
        scheduledTime: localDateTimeString,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : null,
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
