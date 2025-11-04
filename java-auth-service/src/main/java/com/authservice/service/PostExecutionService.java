package com.authservice.service;

import com.authservice.entity.Profile;
import com.authservice.entity.ScheduledPost;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Response;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth10aService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class PostExecutionService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${twitter.api.key:${X_API_KEY:}}")
    private String twitterApiKey;

    @Value("${twitter.api.secret:${X_API_SECRET:}}")
    private String twitterApiSecret;

    @Value("${instagram.graph.api.version:v18.0}")
    private String instagramApiVersion;

    public PostExecutionService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Post to a platform (Twitter/X or Instagram) - for scheduled posts
     * @param scheduledPost The scheduled post entity
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter", "instagram")
     * @return Platform-specific post ID
     */
    public String postToPlatform(ScheduledPost scheduledPost, Profile profile, String platformStr) {
        String platform = platformStr.toLowerCase();
        
        if ("x".equals(platform) || "twitter".equals(platform)) {
            return postToTwitter(scheduledPost, profile);
        } else if ("instagram".equals(platform)) {
            return postToInstagram(scheduledPost, profile);
        } else {
            throw new UnsupportedOperationException("Unsupported platform: " + platformStr);
        }
    }

    /**
     * Post to a platform immediately (for immediate/non-scheduled posts)
     * @param content The post content
     * @param imageUrl Optional image URL
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter", "instagram")
     * @return Platform-specific post ID
     */
    public String postToPlatformImmediate(String content, String imageUrl, Profile profile, String platformStr) {
        String platform = platformStr.toLowerCase();
        
        if ("x".equals(platform) || "twitter".equals(platform)) {
            return postToTwitterImmediate(content, imageUrl, profile);
        } else if ("instagram".equals(platform)) {
            return postToInstagramImmediate(content, imageUrl, profile);
        } else {
            throw new UnsupportedOperationException("Unsupported platform: " + platformStr);
        }
    }

    /**
     * Post to Twitter/X - for scheduled posts
     */
    private String postToTwitter(ScheduledPost scheduledPost, Profile profile) {
        log.info("Posting to Twitter/X for scheduled post ID: {}", scheduledPost.getId());
        
        try {
            // Parse access tokens (stored as "accessToken:accessSecret")
            String[] tokens = profile.getAccessToken().split(":");
            if (tokens.length != 2) {
                throw new IllegalArgumentException("Invalid Twitter access token format in profile. Expected format: 'accessToken:accessSecret'");
            }
            String accessToken = tokens[0];
            String accessSecret = tokens[1];

            // Use OAuth 1.0a with ScribeJava
            return postToTwitterWithOAuth(scheduledPost.getContent(), scheduledPost.getImageUrl(), accessToken, accessSecret);
            
        } catch (Exception e) {
            log.error("Failed to post to Twitter/X: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to post to Twitter/X: " + e.getMessage(), e);
        }
    }

    /**
     * Post to Twitter/X - for immediate posts
     */
    private String postToTwitterImmediate(String content, String imageUrl, Profile profile) {
        log.info("Posting to Twitter/X immediately");
        log.info("Content length: {}, ImageUrl: {}", content != null ? content.length() : 0, imageUrl != null ? imageUrl : "null");
        
        try {
            // Parse access tokens (stored as "accessToken:accessSecret")
            String[] tokens = profile.getAccessToken().split(":");
            if (tokens.length != 2) {
                throw new IllegalArgumentException("Invalid Twitter access token format in profile. Expected format: 'accessToken:accessSecret'");
            }
            String accessToken = tokens[0];
            String accessSecret = tokens[1];

            // Use OAuth 1.0a with ScribeJava
            return postToTwitterWithOAuth(content, imageUrl, accessToken, accessSecret);
            
        } catch (Exception e) {
            log.error("Failed to post to Twitter/X: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to post to Twitter/X: " + e.getMessage(), e);
        }
    }

    /**
     * Post to Instagram - for scheduled posts
     * Note: Instagram Account ID should be stored in Profile. For now, we'll try to extract it from profileUrl or username.
     * TODO: Add accountId field to Profile entity for Instagram Business Account ID
     */
    private String postToInstagram(ScheduledPost scheduledPost, Profile profile) {
        log.info("Posting to Instagram for scheduled post ID: {}", scheduledPost.getId());
        
        try {
            String accessToken = profile.getAccessToken();
            
            // Instagram requires an image - check if we have one
            if (scheduledPost.getImageUrl() == null || scheduledPost.getImageUrl().isEmpty()) {
                throw new IllegalArgumentException("Instagram requires an image URL");
            }
            
            return postToInstagramWithContent(scheduledPost.getContent(), scheduledPost.getImageUrl(), accessToken, profile);
            
        } catch (Exception e) {
            log.error("Failed to post to Instagram: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to post to Instagram: " + e.getMessage(), e);
        }
    }

    /**
     * Post to Instagram - for immediate posts
     */
    private String postToInstagramImmediate(String content, String imageUrl, Profile profile) {
        log.info("Posting to Instagram immediately");
        
        try {
            String accessToken = profile.getAccessToken();
            
            // Instagram requires an image - check if we have one
            if (imageUrl == null || imageUrl.isEmpty()) {
                throw new IllegalArgumentException("Instagram requires an image URL");
            }
            
            return postToInstagramWithContent(content, imageUrl, accessToken, profile);
            
        } catch (Exception e) {
            log.error("Failed to post to Instagram: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to post to Instagram: " + e.getMessage(), e);
        }
    }

    /**
     * Common Instagram posting logic
     */
    private String postToInstagramWithContent(String content, String imageUrl, String accessToken, Profile profile) throws Exception {
        // TODO: Get Instagram Business Account ID from Profile
        // For now, we need to fetch it from the API using the access token
        // The accountId should be stored when profile is created during OAuth callback
        // Temporary workaround: try to get account ID from Graph API
        String accountId = getInstagramAccountId(accessToken, profile);
        
        // Step 1: Create media container
        String createMediaUrl = String.format(
                "https://graph.facebook.com/%s/%s/media",
                instagramApiVersion,
                accountId
        );
        
        Map<String, String> mediaParams = new HashMap<>();
        mediaParams.put("image_url", imageUrl);
        mediaParams.put("caption", content);
        mediaParams.put("access_token", accessToken);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<Map<String, String>> mediaEntity = new HttpEntity<>(mediaParams, headers);
        
        ResponseEntity<String> mediaResponse = restTemplate.exchange(
                createMediaUrl,
                HttpMethod.POST,
                mediaEntity,
                String.class
        );
        
        if (!mediaResponse.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to create Instagram media container: " + mediaResponse.getBody());
        }
        
        JsonNode mediaJson = objectMapper.readTree(mediaResponse.getBody());
        String creationId = mediaJson.get("id").asText();
        log.info("Created Instagram media container. Creation ID: {}", creationId);
        
        // Step 2: Publish the media
        String publishUrl = String.format(
                "https://graph.facebook.com/%s/%s/media_publish",
                instagramApiVersion,
                accountId
        );
        
        Map<String, String> publishParams = new HashMap<>();
        publishParams.put("creation_id", creationId);
        publishParams.put("access_token", accessToken);
        
        HttpEntity<Map<String, String>> publishEntity = new HttpEntity<>(publishParams, headers);
        
        ResponseEntity<String> publishResponse = restTemplate.exchange(
                publishUrl,
                HttpMethod.POST,
                publishEntity,
                String.class
        );
        
        if (!publishResponse.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to publish Instagram post: " + publishResponse.getBody());
        }
        
        JsonNode publishJson = objectMapper.readTree(publishResponse.getBody());
        String postId = publishJson.get("id").asText();
        log.info("Successfully posted to Instagram. Post ID: {}", postId);
        return postId;
    }

    /**
     * Get Instagram Business Account ID from access token
     * This is a workaround until we store accountId in Profile entity
     */
    private String getInstagramAccountId(String accessToken, Profile profile) throws Exception {
        // Try to get account ID from Facebook Graph API
        // First, get the user's pages/accounts
        String meUrl = String.format(
                "https://graph.facebook.com/%s/me/accounts?access_token=%s",
                instagramApiVersion,
                accessToken
        );
        
        ResponseEntity<String> response = restTemplate.getForEntity(meUrl, String.class);
        
        if (response.getStatusCode().is2xxSuccessful()) {
            // Parse to find Instagram Business Account
            // For now, return a placeholder - this needs proper implementation
            log.warn("Instagram account ID lookup not fully implemented. Using username as fallback.");
            // TODO: Properly parse response to get Instagram Business Account ID from Facebook Graph API
            return profile.getUsername(); // Fallback
        }
        
        // Fallback to username if we can't get account ID
        log.warn("Could not fetch Instagram account ID. Using username: {}", profile.getUsername());
        return profile.getUsername();
    }

    /**
     * Post to Twitter using OAuth 1.0a with ScribeJava
     */
    private String postToTwitterWithOAuth(String content, String imageUrl, String accessToken, String accessSecret) throws Exception {
        log.info("postToTwitterWithOAuth called with imageUrl: {}", imageUrl != null ? imageUrl : "null");
        
        // Create OAuth service for Twitter API v2
        OAuth10aService service = new ServiceBuilder(twitterApiKey)
                .apiSecret(twitterApiSecret)
                .build(com.github.scribejava.apis.TwitterApi.instance());

        // Create access token
        OAuth1AccessToken oauthToken = new OAuth1AccessToken(accessToken, accessSecret);

        // Handle image upload if present
        List<String> mediaIds = new ArrayList<>();
        if (imageUrl != null && !imageUrl.isEmpty()) {
            log.info("Attempting to upload image to Twitter from URL: {}", imageUrl);
            try {
                String mediaId = uploadImageToTwitter(imageUrl, service, oauthToken);
                if (mediaId != null) {
                    mediaIds.add(mediaId);
                    log.info("Successfully uploaded image to Twitter. Media ID: {}", mediaId);
                } else {
                    log.warn("Image upload returned null media ID");
                }
            } catch (Exception e) {
                log.error("Failed to upload image to Twitter, posting without image: {}", e.getMessage(), e);
                // Continue without image - image is optional for Twitter
            }
        } else {
            log.info("No image URL provided, posting text-only tweet");
        }

        // Create request
        OAuthRequest request = new OAuthRequest(Verb.POST, "https://api.twitter.com/2/tweets");
        request.addHeader("Content-Type", "application/json");
        
        // Build JSON body
        Map<String, Object> tweetBody = new HashMap<>();
        tweetBody.put("text", content);
        
        // Add media_ids if image was uploaded
        if (!mediaIds.isEmpty()) {
            Map<String, Object> media = new HashMap<>();
            media.put("media_ids", mediaIds);
            tweetBody.put("media", media);
        }
        
        String jsonBody = objectMapper.writeValueAsString(tweetBody);
        request.setPayload(jsonBody);

        // Sign and execute request
        service.signRequest(oauthToken, request);
        Response response = service.execute(request);

        if (response.getCode() == 200 || response.getCode() == 201) {
            JsonNode responseJson = objectMapper.readTree(response.getBody());
            String tweetId = responseJson.get("data").get("id").asText();
            log.info("Successfully posted to Twitter/X. Tweet ID: {}", tweetId);
            return tweetId;
        } else {
            throw new RuntimeException("Twitter API error: " + response.getCode() + " - " + response.getBody());
        }
    }

    /**
     * Upload image to Twitter and return media_id
     * @param imageUrl URL of the image to upload
     * @param service OAuth service for signing requests
     * @param oauthToken OAuth access token
     * @return media_id_string from Twitter
     */
    private String uploadImageToTwitter(String imageUrl, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception {
        log.info("Uploading image to Twitter from URL: {}", imageUrl);
        
        try {
            // Download image using RestTemplate (handles redirects, errors better)
            ResponseEntity<byte[]> imageResponse = restTemplate.getForEntity(imageUrl, byte[].class);
            if (!imageResponse.getStatusCode().is2xxSuccessful()) {
                log.warn("Failed to download image from URL: {} - Status: {}", imageUrl, imageResponse.getStatusCode());
                return null;
            }
            
            byte[] imageBytes = imageResponse.getBody();
            if (imageBytes == null || imageBytes.length == 0) {
                log.warn("Downloaded image is empty from URL: {}", imageUrl);
                return null;
            }
            
            // Twitter media upload endpoint (v1.1)
            OAuthRequest uploadRequest = new OAuthRequest(Verb.POST, "https://upload.twitter.com/1.1/media/upload.json");
            
            // Add image as base64 encoded binary
            String base64Image = java.util.Base64.getEncoder().encodeToString(imageBytes);
            uploadRequest.addParameter("media_data", base64Image);
            
            // Sign and execute upload request
            service.signRequest(oauthToken, uploadRequest);
            Response uploadResponse = service.execute(uploadRequest);
            
            if (uploadResponse.getCode() == 200 || uploadResponse.getCode() == 201) {
                JsonNode uploadJson = objectMapper.readTree(uploadResponse.getBody());
                String mediaId = uploadJson.get("media_id_string").asText();
                log.info("Successfully uploaded image to Twitter. Media ID: {}", mediaId);
                return mediaId;
            } else {
                log.warn("Failed to upload image to Twitter: {} - {}", uploadResponse.getCode(), uploadResponse.getBody());
                return null;
            }
            
        } catch (Exception e) {
            log.error("Error uploading image to Twitter: {}", e.getMessage(), e);
            // Don't fail the entire post if image upload fails, just log and return null
            return null;
        }
    }

}

