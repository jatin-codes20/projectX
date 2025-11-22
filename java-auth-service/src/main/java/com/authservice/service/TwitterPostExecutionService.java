package com.authservice.service;

import com.authservice.entity.Profile;
import com.authservice.entity.ScheduledPost;
import com.authservice.util.ITwitterMediaService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Response;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth10aService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for posting content to Twitter/X platform
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TwitterPostExecutionService implements IPostExecutionService {

    private final ITwitterMediaService twitterMediaService;
    private final ObjectMapper objectMapper;

    @Value("${twitter.api.key:${X_API_KEY:}}")
    private String twitterApiKey;

    @Value("${twitter.api.secret:${X_API_SECRET:}}")
    private String twitterApiSecret;

    /**
     * Post to a platform (Twitter/X) - for scheduled posts
     * @param scheduledPost The scheduled post entity
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter")
     * @return Platform-specific post ID (tweet ID)
     */
    @Override
    public String postToPlatform(ScheduledPost scheduledPost, Profile profile, String platformStr) {
        // Validate platform - only Twitter/X is supported
        String platform = platformStr.toLowerCase();
        if (!"x".equals(platform) && !"twitter".equals(platform)) {
            throw new UnsupportedOperationException("TwitterPostExecutionService only supports Twitter/X platform. Got: " + platformStr);
        }
        
        log.info("Posting to Twitter/X for scheduled post ID: {}", scheduledPost.getId());
        
        try {
            // Parse access tokens (stored as "accessToken:accessSecret")
            String[] tokens = profile.getAccessToken().split(":");
            if (tokens.length != 2) {
                throw new IllegalArgumentException("Invalid Twitter access token format in profile. Expected format: 'accessToken:accessSecret'");
            }
            String accessToken = tokens[0];
            String accessSecret = tokens[1];

            // Use mediaUrls from scheduled post
            List<String> mediaUrls = scheduledPost.getMediaUrls();

            // Use OAuth 1.0a with ScribeJava
            return postToTwitterWithOAuth(scheduledPost.getContent(), mediaUrls, accessToken, accessSecret);
            
        } catch (Exception e) {
            log.error("Failed to post to Twitter/X: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to post to Twitter/X: " + e.getMessage(), e);
        }
    }

    /**
     * Post to a platform immediately (Twitter/X) - for immediate/non-scheduled posts
     * @param content The post content
     * @param mediaUrls Optional list of media URLs (images and/or videos)
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter")
     * @return Platform-specific post ID (tweet ID)
     */
    @Override
    public String postToPlatformImmediate(String content, List<String> mediaUrls, Profile profile, String platformStr) {
        // Validate platform - only Twitter/X is supported
        String platform = platformStr.toLowerCase();
        if (!"x".equals(platform) && !"twitter".equals(platform)) {
            throw new UnsupportedOperationException("TwitterPostExecutionService only supports Twitter/X platform. Got: " + platformStr);
        }
        
        log.info("Posting to Twitter/X immediately");
        log.info("Content length: {}, Media URLs count: {}", content != null ? content.length() : 0, mediaUrls != null ? mediaUrls.size() : 0);
        
        try {
            // Parse access tokens (stored as "accessToken:accessSecret")
            String[] tokens = profile.getAccessToken().split(":");
            if (tokens.length != 2) {
                throw new IllegalArgumentException("Invalid Twitter access token format in profile. Expected format: 'accessToken:accessSecret'");
            }
            String accessToken = tokens[0];
            String accessSecret = tokens[1];

            // Use OAuth 1.0a with ScribeJava
            return postToTwitterWithOAuth(content, mediaUrls, accessToken, accessSecret);
            
        } catch (Exception e) {
            log.error("Failed to post to Twitter/X: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to post to Twitter/X: " + e.getMessage(), e);
        }
    }

    /**
     * Post to Twitter using OAuth 1.0a with ScribeJava
     */
    private String postToTwitterWithOAuth(String content, List<String> mediaUrls, String accessToken, String accessSecret) throws Exception {
        log.info("postToTwitterWithOAuth called with {} media URLs", mediaUrls != null ? mediaUrls.size() : 0);
        
        // Create OAuth service for Twitter API v2
        OAuth10aService service = new ServiceBuilder(twitterApiKey)
                .apiSecret(twitterApiSecret)
                .build(com.github.scribejava.apis.TwitterApi.instance());

        // Create access token
        OAuth1AccessToken oauthToken = new OAuth1AccessToken(accessToken, accessSecret);

        // Handle media uploads (images and videos)
        List<String> mediaIds = new ArrayList<>();
        if (mediaUrls != null && !mediaUrls.isEmpty()) {
            for (String mediaUrl : mediaUrls) {
                try {
                    String mediaId = twitterMediaService.uploadMedia(mediaUrl, service, oauthToken);
                    if (mediaId != null) {
                        mediaIds.add(mediaId);
                        log.info("Successfully uploaded media to Twitter. Media ID: {}", mediaId);
                    } else {
                        log.warn("Media upload returned null media ID for URL: {}", mediaUrl);
                    }
                } catch (Exception e) {
                    log.error("Failed to upload media to Twitter (URL: {}): {}", mediaUrl, e.getMessage(), e);
                    // Continue with other media - media is optional for Twitter
                }
            }
        } else {
            log.info("No media URLs provided, posting text-only tweet");
        }

        // Create request
        OAuthRequest request = new OAuthRequest(Verb.POST, "https://api.twitter.com/2/tweets");
        request.addHeader("Content-Type", "application/json");
        
        // Build JSON body
        Map<String, Object> tweetBody = new HashMap<>();
        tweetBody.put("text", content);
        
        // Add media_ids if media was uploaded (max 4 media items per tweet)
        if (!mediaIds.isEmpty()) {
            // Twitter/X allows up to 4 media items per tweet
            List<String> mediaIdsToUse = mediaIds.size() > 4 ? mediaIds.subList(0, 4) : mediaIds;
            Map<String, Object> media = new HashMap<>();
            media.put("media_ids", mediaIdsToUse);
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

}

