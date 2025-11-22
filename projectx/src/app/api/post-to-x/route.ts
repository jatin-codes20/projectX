import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { postImmediate, getProfileByPlatform } from '@/lib/profileApi';
import { uploadImageToLocal, uploadVideoToLocal } from '@/lib/imageUpload';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '@/lib/cloudinaryUpload';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get('content') as string;
    
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

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    // Get X profile from database (call proxy route directly since we're server-side)
    const profileResponse = await fetch(`${request.nextUrl.origin}/api/profiles/platform/x`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!profileResponse.ok || profileResponse.status === 404) {
      return NextResponse.json(
        { error: 'X/Twitter account not connected. Please connect your account first.' },
        { status: 401 }
      );
    }

    const profileData = await profileResponse.json();
    if (!profileData.id) {
      return NextResponse.json(
        { error: 'X/Twitter account not connected. Please connect your account first.' },
        { status: 401 }
      );
    }

    const profileId = profileData.id;

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
        // Continue with other files - media is optional for Twitter/X
      }
    }

    // Post to platform using backend PostExecutionService
    const postResult = await postImmediate(
      content,
      profileId,
      'x',
      mediaUrls.length > 0 ? mediaUrls : undefined,
      authToken
    );

    if (!postResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: postResult.error || 'Failed to post to X',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully posted to X!',
      postId: postResult.data?.postId,
      platformPostId: postResult.data?.platformPostId,
    });

  } catch (error) {
    console.error('Error in post-to-x API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
