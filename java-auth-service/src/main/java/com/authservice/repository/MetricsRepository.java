package com.authservice.repository;

import com.authservice.entity.Metric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MetricsRepository extends JpaRepository<Metric, UUID> {

    /**
     * Find all metrics for a specific post
     */
    List<Metric> findAllByPostId(Long postId);

    /**
     * Find metrics by post ID and metric name
     */
    Optional<Metric> findByPostIdAndMetricName(Long postId, String metricName);

    /**
     * Find all metrics for a specific post and metric name
     */
    List<Metric> findAllByPostIdAndMetricName(Long postId, String metricName);

    /**
     * Find metrics for posts within a date range
     */
    @Query("SELECT m FROM Metric m WHERE m.post.id IN " +
           "(SELECT p.id FROM Post p WHERE p.profile.id = :profileId) " +
           "AND m.createdAt BETWEEN :startDate AND :endDate")
    List<Metric> findByProfileIdAndDateRange(@Param("profileId") Long profileId,
                                            @Param("startDate") LocalDateTime startDate,
                                            @Param("endDate") LocalDateTime endDate);

    /**
     * Get total value for a specific metric across all posts for a profile
     */
    @Query("SELECT SUM(m.metricValue) FROM Metric m WHERE m.post.id IN " +
           "(SELECT p.id FROM Post p WHERE p.profile.id = :profileId) " +
           "AND m.metricName = :metricName")
    Long getTotalMetricValueByProfileIdAndMetricName(@Param("profileId") Long profileId,
                                                   @Param("metricName") String metricName);

    /**
     * Get average value for a specific metric across all posts for a profile
     */
    @Query("SELECT AVG(m.metricValue) FROM Metric m WHERE m.post.id IN " +
           "(SELECT p.id FROM Post p WHERE p.profile.id = :profileId) " +
           "AND m.metricName = :metricName")
    Double getAverageMetricValueByProfileIdAndMetricName(@Param("profileId") Long profileId,
                                                        @Param("metricName") String metricName);

    /**
     * Get all unique metric names for a profile
     */
    @Query("SELECT DISTINCT m.metricName FROM Metric m WHERE m.post.id IN " +
           "(SELECT p.id FROM Post p WHERE p.profile.id = :profileId)")
    List<String> getDistinctMetricNamesByProfileId(@Param("profileId") Long profileId);

    /**
     * Delete metrics by post ID
     */
    void deleteByPostId(Long postId);

    /**
     * Delete metrics by post ID and metric name
     */
    void deleteByPostIdAndMetricName(Long postId, String metricName);

    /**
     * Delete all metrics for a profile
     */
    @Query("DELETE FROM Metric m WHERE m.post.id IN " +
           "(SELECT p.id FROM Post p WHERE p.profile.id = :profileId)")
    void deleteAllByProfileId(@Param("profileId") Long profileId);
}
