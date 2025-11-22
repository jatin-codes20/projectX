package com.authservice.service;

import com.authservice.dto.CreateScheduledPostRequest;
import com.authservice.dto.ScheduledPostResponse;

import java.util.List;
import java.util.Optional;

/**
 * Interface for managing scheduled posts
 */
public interface IScheduledPostService {
    
    /**
     * Create a new scheduled post and schedule Quartz job
     * @param userId The user ID
     * @param request The scheduled post request
     * @return The created scheduled post response
     * @throws RuntimeException if user not found or scheduling fails
     */
    ScheduledPostResponse createScheduledPost(Long userId, CreateScheduledPostRequest request);
    
    /**
     * Get all scheduled posts for a user
     * @param userId The user ID
     * @return List of scheduled post responses
     */
    List<ScheduledPostResponse> getScheduledPosts(Long userId);
    
    /**
     * Get scheduled post by ID and user ID (for authorization)
     * @param id The scheduled post ID
     * @param userId The user ID
     * @return Optional scheduled post response
     */
    Optional<ScheduledPostResponse> getScheduledPost(Long id, Long userId);
    
    /**
     * Update scheduled post
     * @param id The scheduled post ID
     * @param userId The user ID
     * @param request The updated scheduled post request
     * @return The updated scheduled post response
     * @throws RuntimeException if post not found, cannot be updated, or rescheduling fails
     */
    ScheduledPostResponse updateScheduledPost(Long id, Long userId, CreateScheduledPostRequest request);
    
    /**
     * Delete scheduled post and Quartz job
     * @param id The scheduled post ID
     * @param userId The user ID
     * @throws RuntimeException if post not found or cannot be deleted
     */
    void deleteScheduledPost(Long id, Long userId);
    
    /**
     * Manually trigger a scheduled post for immediate execution (for testing/debugging)
     * @param id The scheduled post ID
     * @param userId The user ID
     * @throws RuntimeException if post not found, cannot be triggered, or scheduling fails
     */
    void triggerScheduledPost(Long id, Long userId);
}

