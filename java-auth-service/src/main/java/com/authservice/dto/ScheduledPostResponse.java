package com.authservice.dto;

import com.authservice.enums.PostStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledPostResponse {

    private Long id;
    private Long userId;
    private String content;
    private List<String> platforms;
    private PostStatus status;
    private LocalDateTime scheduledTime;
    private String imageUrl;
    private Integer retryCount;
    private Integer maxRetries;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

