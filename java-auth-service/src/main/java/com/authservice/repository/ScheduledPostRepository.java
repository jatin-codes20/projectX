package com.authservice.repository;

import com.authservice.entity.ScheduledPost;
import com.authservice.enums.PostStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduledPostRepository extends JpaRepository<ScheduledPost, Long> {

    /**
     * Find all scheduled posts for a specific user
     */
    List<ScheduledPost> findByUserId(Long userId);

    /**
     * Find scheduled posts by user ID and status
     */
    List<ScheduledPost> findByUserIdAndStatus(Long userId, PostStatus status);

    /**
     * Find a specific scheduled post by ID and user ID (for authorization)
     */
    Optional<ScheduledPost> findByIdAndUserId(Long id, Long userId);

    /**
     * Find all posts that are ready to be published (scheduled time has passed and status is PENDING)
     */
    @Query("SELECT sp FROM ScheduledPost sp WHERE sp.scheduledTime <= :now AND sp.status = :status")
    List<ScheduledPost> findReadyPosts(@Param("now") LocalDateTime now, @Param("status") PostStatus status);

    /**
     * Find posts by status (for monitoring)
     */
    List<ScheduledPost> findByStatus(PostStatus status);

    /**
     * Count scheduled posts by status for a user
     */
    long countByUserIdAndStatus(Long userId, PostStatus status);
}

