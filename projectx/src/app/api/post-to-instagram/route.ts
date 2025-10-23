import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { uploadImageToLocal } from '@/lib/imageUpload';
import { uploadImageToCloudinary } from '@/lib/cloudinaryUpload';

// Instagram API configuration
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_USER_ID; // Using INSTAGRAM_USER_ID from .env file

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Debug: Log the access token (first 10 and last 10 characters for security)
    console.log('Instagram Access Token Debug:', {
      hasToken: !!INSTAGRAM_ACCESS_TOKEN,
      tokenLength: INSTAGRAM_ACCESS_TOKEN?.length,
      tokenStart: INSTAGRAM_ACCESS_TOKEN?.substring(0, 10),
      tokenEnd: INSTAGRAM_ACCESS_TOKEN?.substring(INSTAGRAM_ACCESS_TOKEN.length - 10),
      tokenHasSpaces: INSTAGRAM_ACCESS_TOKEN?.includes(' '),
      tokenHasNewlines: INSTAGRAM_ACCESS_TOKEN?.includes('\n'),
      tokenHasTabs: INSTAGRAM_ACCESS_TOKEN?.includes('\t')
    });

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const image = formData.get('image') as File;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Check if we have Instagram API credentials
    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
      // Demo mode - simulate Instagram posting
      console.log('Instagram API credentials not configured. Running in demo mode.');
      
      // Simulate image upload
      if (image) {
        const uploadResult = await uploadImageToLocal(image);
        if (uploadResult.success) {
          console.log('Demo: Image uploaded successfully:', uploadResult.url);
        }
      }
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return NextResponse.json({
        success: true,
        message: 'Demo: Successfully posted to Instagram! (No Facebook Page connected)',
        postId: `ig_demo_${Date.now()}`,
        imageUploaded: !!image,
        demo: true,
        note: 'To post to Instagram for real, you need to: 1) Create a Facebook Page, 2) Connect your Instagram Business account to that Page, 3) Get the Instagram Account ID from the connected Page.'
      });
    }

    console.log('Instagram post data:', {
      content: content,
      hasImage: !!image,
      imageName: image?.name,
      imageSize: image?.size,
      hasAccessToken: !!INSTAGRAM_ACCESS_TOKEN,
      hasAccountId: !!INSTAGRAM_ACCOUNT_ID
    });

    // Check if we have a valid token but no account ID (no Facebook Page connected)
    if (INSTAGRAM_ACCESS_TOKEN && !INSTAGRAM_ACCOUNT_ID) {
      return NextResponse.json({
        success: false,
        message: 'Instagram Business Account not connected to Facebook Page',
        error: 'No Instagram Account ID found',
        note: 'You have a valid access token, but no Instagram Business account is connected to a Facebook Page. Please: 1) Create a Facebook Page, 2) Connect your Instagram Business account to that Page, 3) Update INSTAGRAM_USER_ID in your .env file with the Instagram Account ID from the connected Page.'
      }, { status: 400 });
    }

          if (image) {
            try {
              let imageUrl: string;
              let uploadResult: any;

              // Try Cloudinary first if credentials are available
              if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
                console.log('Uploading to Cloudinary...');
                uploadResult = await uploadImageToCloudinary(
                  image,
                  CLOUDINARY_CLOUD_NAME,
                  CLOUDINARY_API_KEY,
                  CLOUDINARY_API_SECRET
                );

                if (uploadResult.success) {
                  imageUrl = uploadResult.url!;
                  console.log('Image uploaded to Cloudinary:', imageUrl);
                } else {
                  console.log('Cloudinary upload failed, falling back to local storage');
                  throw new Error(uploadResult.error);
                }
              } else {
                // Fallback to local storage
                console.log('Cloudinary not configured, using local storage');
                uploadResult = await uploadImageToLocal(image);

                if (!uploadResult.success) {
                  return NextResponse.json({
                    success: false,
                    message: 'Failed to upload image',
                    error: uploadResult.error
                  }, { status: 400 });
                }

                // For local development, we need to provide the full URL
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                imageUrl = `${baseUrl}${uploadResult.url}`;
                console.log('Image uploaded to local storage:', imageUrl);
              }

        // Step 2: Create media container using Instagram Graph API
        const createMediaResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media`,
          {
            image_url: imageUrl,
            caption: content,
            access_token: INSTAGRAM_ACCESS_TOKEN
          }
        );

        const creationId = createMediaResponse.data.id;
        console.log('Media container created:', creationId);

        // Step 3: Publish the media
        const publishResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
          {
            creation_id: creationId,
            access_token: INSTAGRAM_ACCESS_TOKEN
          }
        );

        console.log('Media published successfully:', publishResponse.data.id);

        return NextResponse.json({
          success: true,
          message: 'Successfully posted to Instagram!',
          postId: publishResponse.data.id,
          imageUploaded: true,
          mediaId: creationId,
          imageUrl: imageUrl
        });

      } catch (instagramError: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = instagramError as any;
        console.error('Instagram API error:', error.response?.data || error.message);
        
        // Return a more detailed error message
        let errorMessage = 'Failed to post to Instagram. Please check your API credentials and permissions.';
        if (error.response?.data?.error?.message) {
          errorMessage = `Instagram API Error: ${error.response.data.error.message}`;
        }
        
        return NextResponse.json({
          success: false,
          message: errorMessage,
          errorCode: error.response?.data?.error?.code,
          errorDetails: error.response?.data?.error
        }, { status: 400 });
      }
    } else {
      // For text-only posts (Instagram doesn't support text-only posts, but we'll handle gracefully)
      return NextResponse.json({
        success: false,
        message: 'Instagram requires an image to be posted. Please upload an image.',
        error: 'Image required for Instagram posts'
      }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('Error in post-to-instagram API:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err.message || 'An unexpected error occurred while posting to Instagram'
      },
      { status: 500 }
    );
  }
}
