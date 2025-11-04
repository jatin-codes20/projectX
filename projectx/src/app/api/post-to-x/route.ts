import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { postImmediate, getProfileByPlatform } from '@/lib/profileApi';
import { uploadImageToLocal } from '@/lib/imageUpload';
import { uploadImageToCloudinary } from '@/lib/cloudinaryUpload';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const image = formData.get('image') as File | null;

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
            console.log('Image uploaded to Cloudinary:', imageUrl);
          } else {
            // Fallback to local storage
            console.log('Cloudinary upload failed, falling back to local storage');
            const localResult = await uploadImageToLocal(image);
            if (localResult.success) {
              const baseUrl = request.nextUrl.origin;
              imageUrl = `${baseUrl}${localResult.url}`;
              console.log('Image uploaded to local storage:', imageUrl);
            }
          }
        } else {
          // Fallback to local storage
          console.log('Cloudinary not configured, using local storage');
          const uploadResult = await uploadImageToLocal(image);
          if (uploadResult.success) {
            const baseUrl = request.nextUrl.origin;
            imageUrl = `${baseUrl}${uploadResult.url}`;
            console.log('Image uploaded to local storage:', imageUrl);
          }
        }
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue without image - image is optional for Twitter/X
      }
    }

    // Post to platform using backend PostExecutionService
    const postResult = await postImmediate(
      content,
      profileId,
      'x',
      imageUrl,
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
