package com.authservice.job;

import com.authservice.entity.Post;
import com.authservice.entity.Profile;
import com.authservice.entity.ScheduledPost;
import com.authservice.enums.PostStatus;
import com.authservice.enums.PlatformType;
import com.authservice.repository.ScheduledPostRepository;
import com.authservice.repository.ProfileRepository;
import com.authservice.service.PostExecutionService;
import com.authservice.service.PostService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class PostExecutionJob implements Job {

    @Autowired
    private ScheduledPostRepository scheduledPostRepository;
    
    @Autowired
    private ProfileRepository profileRepository;
    
    @Autowired
    private PostService postService;
    
    @Autowired
    private PostExecutionService postExecutionService;

    @Override
    @Transactional
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap jobDataMap = context.getJobDetail().getJobDataMap();
        Long scheduledPostId = jobDataMap.getLong("scheduledPostId");

        log.info("Executing PostExecutionJob for scheduled post ID: {}", scheduledPostId);

        try {
            // Fetch scheduled post
            Optional<ScheduledPost> postOpt = scheduledPostRepository.findById(scheduledPostId);
            if (postOpt.isEmpty()) {
                log.error("Scheduled post not found with ID: {}", scheduledPostId);
                return;
            }

            ScheduledPost scheduledPost = postOpt.get();

            // Check if already processed
            if (scheduledPost.getStatus() != PostStatus.PENDING) {
                log.info("Scheduled post {} already processed with status: {}", scheduledPostId, scheduledPost.getStatus());
                return;
            }

            // Update status to PROCESSING (with optimistic locking)
            try {
                scheduledPost.setStatus(PostStatus.PROCESSING);
                scheduledPostRepository.save(scheduledPost);
            } catch (Exception e) {
                log.warn("Failed to update status to PROCESSING (likely concurrent execution): {}", e.getMessage());
                return; // Another instance is processing
            }

            // Post to each platform
            List<String> platforms = scheduledPost.getPlatforms();
            boolean allSucceeded = true;
            String lastError = null;

            for (String platformStr : platforms) {
                try {
                    PlatformType platformType = PlatformType.valueOf(platformStr.toUpperCase());
                    
                    // Get profile for this platform
                    Optional<Profile> profileOpt = profileRepository
                            .findByUserIdAndPlatform(scheduledPost.getUser().getId(), platformType);

                    if (profileOpt.isEmpty()) {
                        log.error("Profile not found for user {} and platform {}", 
                                scheduledPost.getUser().getId(), platformType);
                        allSucceeded = false;
                        lastError = "Profile not found for platform: " + platformStr;
                        continue;
                    }

                    Profile profile = profileOpt.get();

                    // Post to platform (will be implemented in PostExecutionService)
                    String platformPostId = postExecutionService.postToPlatform(
                            scheduledPost, 
                            profile, 
                            platformStr
                    );

                    // Create Post entity in DB
                    Post post = new Post();
                    post.setContent(scheduledPost.getContent());
                    post.setProfile(profile);
                    post.setCreatedAt(LocalDateTime.now());
                    Post savedPost = postService.createPost(post);

                    log.info("Successfully posted to {} for scheduled post ID: {} and saved Post with ID: {}", 
                            platformStr, scheduledPostId, savedPost.getId());

                } catch (Exception e) {
                    log.error("Failed to post to {} for scheduled post ID: {}", platformStr, scheduledPostId, e);
                    allSucceeded = false;
                    lastError = "Failed to post to " + platformStr + ": " + e.getMessage();
                }
            }

            // Update final status
            if (allSucceeded) {
                scheduledPost.setStatus(PostStatus.PUBLISHED);
                scheduledPost.setErrorMessage(null);
                log.info("Successfully completed all posts for scheduled post ID: {}", scheduledPostId);
            } else {
                // Check if we should retry
                if (scheduledPost.getRetryCount() < scheduledPost.getMaxRetries()) {
                    // Reschedule with delay (will be handled by retry logic)
                    scheduledPost.setStatus(PostStatus.PENDING);
                    scheduledPost.setRetryCount(scheduledPost.getRetryCount() + 1);
                    scheduledPost.setErrorMessage(lastError);
                    log.info("Scheduled post {} will be retried (attempt {}/{})", 
                            scheduledPostId, scheduledPost.getRetryCount(), scheduledPost.getMaxRetries());
                } else {
                    scheduledPost.setStatus(PostStatus.FAILED);
                    scheduledPost.setErrorMessage(lastError);
                    log.error("Scheduled post {} failed after {} retries", 
                            scheduledPostId, scheduledPost.getMaxRetries());
                }
            }

            scheduledPostRepository.save(scheduledPost);

        } catch (Exception e) {
            log.error("Error executing PostExecutionJob for scheduled post ID: {}", scheduledPostId, e);
            // Update status to FAILED if not already updated
            try {
                Optional<ScheduledPost> postOpt = scheduledPostRepository.findById(scheduledPostId);
                postOpt.ifPresent(post -> {
                    post.setStatus(PostStatus.FAILED);
                    post.setErrorMessage(e.getMessage());
                    scheduledPostRepository.save(post);
                });
            } catch (Exception ex) {
                log.error("Failed to update status to FAILED", ex);
            }
        }
    }
}

