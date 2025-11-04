package com.authservice.service;

import com.authservice.dto.CreateScheduledPostRequest;
import com.authservice.dto.ScheduledPostResponse;
import com.authservice.entity.ScheduledPost;
import com.authservice.entity.User;
import com.authservice.enums.PostStatus;
import com.authservice.job.PostExecutionJob;
import com.authservice.repository.ScheduledPostRepository;
import com.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ScheduledPostService {

    private final ScheduledPostRepository scheduledPostRepository;
    private final UserRepository userRepository;
    private final Scheduler scheduler;

    /**
     * Create a new scheduled post and schedule Quartz job
     */
    public ScheduledPostResponse createScheduledPost(Long userId, CreateScheduledPostRequest request) {
        log.info("Creating scheduled post for user {} with scheduled time {}", userId, request.getScheduledTime());

        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        // Create ScheduledPost entity
        ScheduledPost scheduledPost = new ScheduledPost();
        scheduledPost.setUser(user);
        scheduledPost.setContent(request.getContent());
        scheduledPost.setPlatforms(request.getPlatforms());
        scheduledPost.setScheduledTime(request.getScheduledTime());
        scheduledPost.setImageUrl(request.getImageUrl());
        scheduledPost.setStatus(PostStatus.PENDING);

        // Save to database
        ScheduledPost savedPost = scheduledPostRepository.save(scheduledPost);
        log.info("Saved scheduled post with ID: {}", savedPost.getId());

        // Schedule Quartz job
        scheduleQuartzJob(savedPost);

        return convertToResponse(savedPost);
    }

    /**
     * Schedule Quartz job for the scheduled post
     */
    private void scheduleQuartzJob(ScheduledPost scheduledPost) {
        try {
            // Create job detail
            JobDetail jobDetail = JobBuilder.newJob(PostExecutionJob.class)
                    .withIdentity("post-" + scheduledPost.getId(), "scheduled-posts")
                    .usingJobData("scheduledPostId", scheduledPost.getId())
                    .storeDurably(false)
                    .build();

            // Create trigger (fire at scheduled time)
            Date triggerTime = Date.from(
                    scheduledPost.getScheduledTime().atZone(ZoneId.systemDefault()).toInstant()
            );

            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity("trigger-" + scheduledPost.getId(), "scheduled-posts")
                    .startAt(triggerTime)
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                            .withMisfireHandlingInstructionFireNow())
                    .build();

            // Schedule the job
            scheduler.scheduleJob(jobDetail, trigger);
            log.info("Scheduled Quartz job for post ID: {} at {}", scheduledPost.getId(), scheduledPost.getScheduledTime());

        } catch (SchedulerException e) {
            log.error("Failed to schedule Quartz job for post ID: {}", scheduledPost.getId(), e);
            throw new RuntimeException("Failed to schedule post", e);
        }
    }

    /**
     * Get all scheduled posts for a user
     */
    @Transactional(readOnly = true)
    public List<ScheduledPostResponse> getScheduledPosts(Long userId) {
        List<ScheduledPost> posts = scheduledPostRepository.findByUserId(userId);
        return posts.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get scheduled post by ID and user ID (for authorization)
     */
    @Transactional(readOnly = true)
    public Optional<ScheduledPostResponse> getScheduledPost(Long id, Long userId) {
        return scheduledPostRepository.findByIdAndUserId(id, userId)
                .map(this::convertToResponse);
    }

    /**
     * Update scheduled post
     */
    public ScheduledPostResponse updateScheduledPost(Long id, Long userId, CreateScheduledPostRequest request) {
        log.info("Updating scheduled post ID: {} for user {}", id, userId);

        ScheduledPost scheduledPost = scheduledPostRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Scheduled post not found"));

        // Check if post can be updated (only PENDING posts can be updated)
        if (scheduledPost.getStatus() != PostStatus.PENDING) {
            throw new RuntimeException("Cannot update post with status: " + scheduledPost.getStatus());
        }

        // Update fields
        scheduledPost.setContent(request.getContent());
        scheduledPost.setPlatforms(request.getPlatforms());
        
        boolean timeChanged = !scheduledPost.getScheduledTime().equals(request.getScheduledTime());
        scheduledPost.setScheduledTime(request.getScheduledTime());
        scheduledPost.setImageUrl(request.getImageUrl());

        ScheduledPost savedPost = scheduledPostRepository.save(scheduledPost);

        // If scheduled time changed, reschedule Quartz job
        if (timeChanged) {
            deleteQuartzJob(id);
            scheduleQuartzJob(savedPost);
            log.info("Rescheduled Quartz job for post ID: {}", id);
        }

        return convertToResponse(savedPost);
    }

    /**
     * Delete scheduled post and Quartz job
     */
    public void deleteScheduledPost(Long id, Long userId) {
        log.info("Deleting scheduled post ID: {} for user {}", id, userId);

        ScheduledPost scheduledPost = scheduledPostRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Scheduled post not found"));

        // Check if post can be deleted (only PENDING posts can be deleted)
        if (scheduledPost.getStatus() != PostStatus.PENDING) {
            throw new RuntimeException("Cannot delete post with status: " + scheduledPost.getStatus());
        }

        // Delete Quartz job
        deleteQuartzJob(id);

        // Delete from database
        scheduledPostRepository.deleteById(id);
        log.info("Deleted scheduled post ID: {}", id);
    }

    /**
     * Delete Quartz job for a scheduled post
     */
    private void deleteQuartzJob(Long scheduledPostId) {
        try {
            JobKey jobKey = new JobKey("post-" + scheduledPostId, "scheduled-posts");
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
                log.info("Deleted Quartz job for post ID: {}", scheduledPostId);
            }
        } catch (SchedulerException e) {
            log.error("Failed to delete Quartz job for post ID: {}", scheduledPostId, e);
        }
    }

    /**
     * Convert ScheduledPost entity to DTO
     */
    private ScheduledPostResponse convertToResponse(ScheduledPost scheduledPost) {
        ScheduledPostResponse response = new ScheduledPostResponse();
        response.setId(scheduledPost.getId());
        response.setUserId(scheduledPost.getUser().getId());
        response.setContent(scheduledPost.getContent());
        response.setPlatforms(scheduledPost.getPlatforms());
        response.setStatus(scheduledPost.getStatus());
        response.setScheduledTime(scheduledPost.getScheduledTime());
        response.setImageUrl(scheduledPost.getImageUrl());
        response.setRetryCount(scheduledPost.getRetryCount());
        response.setMaxRetries(scheduledPost.getMaxRetries());
        response.setErrorMessage(scheduledPost.getErrorMessage());
        response.setCreatedAt(scheduledPost.getCreatedAt());
        response.setUpdatedAt(scheduledPost.getUpdatedAt());
        return response;
    }

    /**
     * Manual trigger for testing (reschedule job to execute immediately)
     */
    public void triggerScheduledPost(Long id, Long userId) {
        log.info("Manually triggering scheduled post ID: {} for user {}", id, userId);

        ScheduledPost scheduledPost = scheduledPostRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Scheduled post not found"));

        if (scheduledPost.getStatus() != PostStatus.PENDING) {
            throw new RuntimeException("Cannot trigger post with status: " + scheduledPost.getStatus());
        }

        // Reschedule to execute immediately
        deleteQuartzJob(id);
        
        try {
            JobDetail jobDetail = JobBuilder.newJob(PostExecutionJob.class)
                    .withIdentity("post-" + scheduledPost.getId(), "scheduled-posts")
                    .usingJobData("scheduledPostId", scheduledPost.getId())
                    .storeDurably(false)
                    .build();

            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity("trigger-" + scheduledPost.getId(), "scheduled-posts")
                    .startNow() // Execute immediately
                    .build();

            scheduler.scheduleJob(jobDetail, trigger);
            log.info("Manually triggered Quartz job for post ID: {}", id);

        } catch (SchedulerException e) {
            log.error("Failed to manually trigger job for post ID: {}", id, e);
            throw new RuntimeException("Failed to trigger post", e);
        }
    }
}

