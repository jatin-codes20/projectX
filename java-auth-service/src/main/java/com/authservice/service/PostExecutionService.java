package com.authservice.service;

import com.authservice.entity.Profile;
import com.authservice.entity.ScheduledPost;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class PostExecutionService implements IPostExecutionService {

    private final TwitterPostExecutionService twitterPostExecutionService;

    public PostExecutionService(TwitterPostExecutionService twitterPostExecutionService) {
        this.twitterPostExecutionService = twitterPostExecutionService;
    }

    /**
     * Post to a platform (Twitter/X) - for scheduled posts
     * @param scheduledPost The scheduled post entity
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter")
     * @return Platform-specific post ID
     */
    @Override
    public String postToPlatform(ScheduledPost scheduledPost, Profile profile, String platformStr) {
        String platform = platformStr.toLowerCase();
        
        if ("x".equals(platform) || "twitter".equals(platform)) {
            return twitterPostExecutionService.postToPlatform(scheduledPost, profile, platformStr);
        } else {
            throw new UnsupportedOperationException("Unsupported platform: " + platformStr + ". Only Twitter/X is currently supported.");
        }
    }

    /**
     * Post to a platform immediately (for immediate/non-scheduled posts)
     * @param content The post content
     * @param mediaUrls Optional list of media URLs (images and/or videos)
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter")
     * @return Platform-specific post ID
     */
    @Override
    public String postToPlatformImmediate(String content, List<String> mediaUrls, Profile profile, String platformStr) {
        String platform = platformStr.toLowerCase();
        
        if ("x".equals(platform) || "twitter".equals(platform)) {
            return twitterPostExecutionService.postToPlatformImmediate(content, mediaUrls, profile, platformStr);
        } else {
            throw new UnsupportedOperationException("Unsupported platform: " + platformStr + ". Only Twitter/X is currently supported.");
        }
    }
}

