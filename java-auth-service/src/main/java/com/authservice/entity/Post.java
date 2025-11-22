package com.authservice.entity;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name="posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"profile", "metrics"}) // Exclude circular references from toString
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "profile.posts", "profile.user"})
public class Post {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="content")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id", nullable = false)
    @JsonIgnore // Ignore profile during serialization to avoid Hibernate proxy issues
    private Profile profile;

    @Column(name="created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "media_urls", columnDefinition = "TEXT")
    private String mediaUrlsJson; // Stored as JSON array: ["url1", "url2", ...]

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore // Ignore metrics during serialization to avoid Hibernate proxy issues
    private List<Metric> metrics;

    // Helper methods for mediaUrls JSON
    private static final ObjectMapper objectMapper = new ObjectMapper();

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

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
    
}
