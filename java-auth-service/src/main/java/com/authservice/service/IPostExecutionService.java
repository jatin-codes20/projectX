package com.authservice.service;

import com.authservice.entity.Profile;
import com.authservice.entity.ScheduledPost;

import java.util.List;

/**
 * Interface for posting content to social media platforms (Twitter/X, Instagram)
 */
public interface IPostExecutionService {
    
    /**
     * Post to a platform (Twitter/X or Instagram) - for scheduled posts
     * @param scheduledPost The scheduled post entity
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter", "instagram")
     * @return Platform-specific post ID
     * @throws RuntimeException if posting fails
     */
    String postToPlatform(ScheduledPost scheduledPost, Profile profile, String platformStr);
    
    /**
     * Post to a platform immediately (for immediate/non-scheduled posts)
     * @param content The post content
     * @param mediaUrls Optional list of media URLs (images and/or videos)
     * @param profile The profile for the platform
     * @param platformStr Platform name ("x", "twitter", "instagram")
     * @return Platform-specific post ID
     * @throws RuntimeException if posting fails
     */
    String postToPlatformImmediate(String content, List<String> mediaUrls, Profile profile, String platformStr);
}

