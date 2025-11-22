package com.authservice.util;

import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.oauth.OAuth10aService;

/**
 * Interface for Twitter/X media upload operations
 */
public interface ITwitterMediaService {
    
    /**
     * Upload media (image or video) to Twitter/X from a URL
     * Automatically detects media type and uses appropriate upload method
     * @param mediaUrl URL of the media to upload
     * @param service OAuth service for signing requests
     * @param oauthToken OAuth access token
     * @return media_id_string from Twitter, or null if upload fails
     * @throws Exception if upload fails
     */
    String uploadMedia(String mediaUrl, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception;
    
    /**
     * Upload image to Twitter/X using simple upload (base64)
     * @param imageBytes Image bytes
     * @param service OAuth service for signing requests
     * @param oauthToken OAuth access token
     * @return media_id_string from Twitter
     * @throws Exception if upload fails
     */
    String uploadImage(byte[] imageBytes, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception;
    
    /**
     * Upload video to Twitter/X using chunked upload
     * @param videoBytes Video bytes
     * @param service OAuth service for signing requests
     * @param oauthToken OAuth access token
     * @return media_id_string from Twitter
     * @throws Exception if upload fails
     */
    String uploadVideo(byte[] videoBytes, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception;
    
    /**
     * Wait for video processing to complete
     * @param mediaId Media ID from Twitter
     * @param service OAuth service for signing requests
     * @param oauthToken OAuth access token
     * @return media_id_string when processing is complete
     * @throws Exception if processing fails or times out
     */
    String waitForVideoProcessing(String mediaId, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception;
}

