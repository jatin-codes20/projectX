import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { uploadImageToLocal } from '@/lib/imageUpload';
import { uploadImageToCloudinary } from '@/lib/cloudinaryUpload';
import { getSession } from '@/lib/session';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const image = formData.get('image') as File;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get session to check for Instagram authentication
    const session = await getSession();
    
    if (!session.instagram?.accessToken || !session.instagram?.accountId) {
      // Demo mode - simulate Instagram posting
      console.log('Instagram account not connected. Running in demo mode.');
      
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
        message: 'Demo: Successfully posted to Instagram! (No Instagram account connected)',
        postId: `ig_demo_${Date.now()}`,
        imageUploaded: !!image,
        demo: true,
        note: 'To post to Instagram for real, please connect your Instagram account using the OAuth flow.'
      });
    }

    console.log('Instagram post data:', {
      content: content,
      hasImage: !!image,
      imageName: image?.name,
      imageSize: image?.size,
      hasAccessToken: !!session.instagram.accessToken,
      hasAccountId: !!session.instagram.accountId
    });

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
                `https://graph.facebook.com/v18.0/${session.instagram.accountId}/media`,
                {
                  image_url: imageUrl,
                  caption: content,
                  access_token: session.instagram.accessToken
                }
              );

              const creationId = createMediaResponse.data.id;
              console.log('Media container created:', creationId);

              // Step 3: Publish the media
              const publishResponse = await axios.post(
                `https://graph.facebook.com/v18.0/${session.instagram.accountId}/media_publish`,
                {
                  creation_id: creationId,
                  access_token: session.instagram.accessToken
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
