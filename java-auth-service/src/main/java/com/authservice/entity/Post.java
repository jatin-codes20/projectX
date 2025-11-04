package com.authservice.entity;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore // Ignore metrics during serialization to avoid Hibernate proxy issues
    private List<Metric> metrics;
  

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
    
}
