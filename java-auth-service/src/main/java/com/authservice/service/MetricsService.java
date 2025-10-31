package com.authservice.service;

import com.authservice.entity.Metric;
import com.authservice.entity.Post;
import com.authservice.repository.MetricsRepository;
import com.authservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MetricsService {

    private final MetricsRepository metricsRepository;
    private final PostRepository postRepository;

    /**
     * Create or update metrics for a post (key-value pairs)
     */
    public List<Metric> createOrUpdateMetrics(Long postId, Map<String, Long> metricsData) {
        log.info("Creating or updating metrics for post ID: {}", postId);
        
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found with ID: " + postId));
        log.info("Post found: {}", post);
        log.info("Metrics data: {}", metricsData);
        List<Metric> savedMetrics = metricsData.entrySet().stream()
                .map(entry -> {
                    String metricName = entry.getKey();
                    Long metricValue = entry.getValue();
                    
                    // Check if metric already exists
                    Optional<Metric> existingMetric = metricsRepository.findByPostIdAndMetricName(postId, metricName);

                    
                    Metric metric;
                    if (existingMetric.isPresent()) {
                        metric = existingMetric.get();
                        metric.setMetricValue(metricValue);
                        log.info("Updating existing metric {} for post ID: {}", metricName, postId);
                    } else {
                        metric = new Metric();
                        metric.setPost(post);
                        metric.setMetricName(metricName);
                        metric.setMetricValue(metricValue);
                        log.info("Creating new metric {} for post ID: {}", metricName, postId);
                    }
                    
                    return metricsRepository.save(metric);
                })
                .collect(Collectors.toList());

        return savedMetrics;
    }

    /**
     * Get all metrics for a specific post
     */
    @Transactional(readOnly = true)
    public List<Metric> getMetricsByPostId(Long postId) {
        log.info("Fetching metrics for post ID: {}", postId);
        return metricsRepository.findAllByPostId(postId);
    }

    /**
     * Get metrics for a profile within date range
     */
    @Transactional(readOnly = true)
    public List<Metric> getMetricsByProfileIdAndDateRange(Long profileId, LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Fetching metrics for profile ID: {} between {} and {}", profileId, startDate, endDate);
        return metricsRepository.findByProfileIdAndDateRange(profileId, startDate, endDate);
    }

    /**
     * Get analytics summary for a profile
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAnalyticsSummary(Long profileId) {
        log.info("Generating analytics summary for profile ID: {}", profileId);
        
        List<String> availableMetrics = metricsRepository.getDistinctMetricNamesByProfileId(profileId);
        
        Map<String, Object> summary = availableMetrics.stream()
                .collect(Collectors.toMap(
                        metricName -> metricName + "_total",
                        metricName -> {
                            Long total = metricsRepository.getTotalMetricValueByProfileIdAndMetricName(profileId, metricName);
                            return total != null ? total : 0L;
                        }
                ));
        
        // Add averages for numeric metrics
        availableMetrics.forEach(metricName -> {
            Double average = metricsRepository.getAverageMetricValueByProfileIdAndMetricName(profileId, metricName);
            if (average != null) {
                summary.put(metricName + "_average", average);
            }
        });
        
        return summary;
    }

    /**
     * Delete metrics for a specific post
     */
    public void deleteMetricsByPostId(Long postId) {
        log.info("Deleting metrics for post ID: {}", postId);
        metricsRepository.deleteByPostId(postId);
    }

    /**
     * Delete specific metric for a post
     */
    public void deleteMetricByPostIdAndName(Long postId, String metricName) {
        log.info("Deleting metric {} for post ID: {}", metricName, postId);
        metricsRepository.deleteByPostIdAndMetricName(postId, metricName);
    }

    /**
     * Delete all metrics for a profile
     */
    public void deleteAllMetricsByProfileId(Long profileId) {
        log.info("Deleting all metrics for profile ID: {}", profileId);
        metricsRepository.deleteAllByProfileId(profileId);
    }
}
