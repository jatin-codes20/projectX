package com.authservice.entity;

import com.authservice.enums.PostStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "scheduled_posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user.scheduledPosts"})
public class ScheduledPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "platforms", columnDefinition = "TEXT", nullable = false)
    private String platformsJson; // Stored as JSON: ["twitter", "instagram"]

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PostStatus status = PostStatus.PENDING;

    @Column(name = "scheduled_time", nullable = false)
    private LocalDateTime scheduledTime;

    @Column(name = "media_urls", columnDefinition = "TEXT")
    private String mediaUrlsJson; // Stored as JSON array: ["url1", "url2", ...]

    @Column(name = "retry_count")
    private Integer retryCount = 0;

    @Column(name = "max_retries")
    private Integer maxRetries = 3;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version; // Optimistic locking

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = PostStatus.PENDING;
        }
        if (retryCount == null) {
            retryCount = 0;
        }
        if (maxRetries == null) {
            maxRetries = 3;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper methods for platforms JSON
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public List<String> getPlatforms() {
        try {
            if (platformsJson == null || platformsJson.isEmpty()) {
                return new ArrayList<>();
            }
            return objectMapper.readValue(platformsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void setPlatforms(List<String> platforms) {
        try {
            this.platformsJson = objectMapper.writeValueAsString(platforms);
        } catch (Exception e) {
            this.platformsJson = "[]";
        }
    }

    // Helper methods for mediaUrls JSON
    public List<String> getMediaUrls() {
        try {
            if (mediaUrlsJson == null || mediaUrlsJson.isEmpty()) {
                return new ArrayList<>();
            }
            return objectMapper.readValue(mediaUrlsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void setMediaUrls(List<String> mediaUrls) {
        try {
            this.mediaUrlsJson = objectMapper.writeValueAsString(mediaUrls);
        } catch (Exception e) {
            this.mediaUrlsJson = "[]";
        }
    }
}

