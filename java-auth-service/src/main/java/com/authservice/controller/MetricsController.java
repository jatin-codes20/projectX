package com.authservice.controller;

import com.authservice.entity.Metric;
import com.authservice.service.MetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MetricsController {

    private final MetricsService metricsService;

    /**
     * Create or update metrics for a post (key-value pairs)
     */
    @PostMapping("/post/{postId}")
    public ResponseEntity<List<Metric>> createOrUpdateMetrics(@PathVariable Long postId, @RequestBody Map<String, Long> metricsData) {
        try {
            log.info("Creating or updating metrics for post ID: {}", postId);
            List<Metric> savedMetrics = metricsService.createOrUpdateMetrics(postId, metricsData);
            return ResponseEntity.ok(savedMetrics);
        } catch (Exception e) {
            log.error("Error creating/updating metrics for post {}: {}", postId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all metrics for a specific post
     */
    @GetMapping("/post/{postId}")
    public ResponseEntity<List<Metric>> getMetricsByPostId(@PathVariable Long postId) {
        try {
            log.info("Fetching metrics for post ID: {}", postId);
            List<Metric> metrics = metricsService.getMetricsByPostId(postId);
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            log.error("Error fetching metrics for post {}: {}", postId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get metrics for a profile within date range
     */
    @GetMapping("/profile/{profileId}")
    public ResponseEntity<List<Metric>> getMetricsByProfileIdAndDateRange(
            @PathVariable Long profileId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        try {
            log.info("Fetching metrics for profile ID: {} between {} and {}", profileId, startDate, endDate);
            List<Metric> metrics = metricsService.getMetricsByProfileIdAndDateRange(profileId, startDate, endDate);
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            log.error("Error fetching metrics for profile {}: {}", profileId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get analytics summary for a profile
     */
    @GetMapping("/profile/{profileId}/analytics")
    public ResponseEntity<Map<String, Object>> getAnalyticsSummary(@PathVariable Long profileId) {
        try {
            log.info("Generating analytics summary for profile ID: {}", profileId);
            Map<String, Object> summary = metricsService.getAnalyticsSummary(profileId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("Error generating analytics summary for profile {}: {}", profileId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete all metrics for a specific post
     */
    @DeleteMapping("/post/{postId}")
    public ResponseEntity<Void> deleteMetricsByPostId(@PathVariable Long postId) {
        try {
            log.info("Deleting metrics for post ID: {}", postId);
            metricsService.deleteMetricsByPostId(postId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting metrics for post {}: {}", postId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete specific metric for a post
     */
    @DeleteMapping("/post/{postId}/{metricName}")
    public ResponseEntity<Void> deleteMetricByPostIdAndName(@PathVariable Long postId, @PathVariable String metricName) {
        try {
            log.info("Deleting metric {} for post ID: {}", metricName, postId);
            metricsService.deleteMetricByPostIdAndName(postId, metricName);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting metric {} for post {}: {}", metricName, postId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete all metrics for a profile
     */
    @DeleteMapping("/profile/{profileId}")
    public ResponseEntity<Void> deleteAllMetricsByProfileId(@PathVariable Long profileId) {
        try {
            log.info("Deleting all metrics for profile ID: {}", profileId);
            metricsService.deleteAllMetricsByProfileId(profileId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting all metrics for profile {}: {}", profileId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
