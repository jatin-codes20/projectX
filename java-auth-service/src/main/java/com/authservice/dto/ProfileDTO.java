package com.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileDTO {

    private Long id;
    private Long userId;
    private String platform; // 'instagram', 'x'
    private String username;
    private String profileUrl;
    private String accessToken;
    private Integer followersCount;
    private String bio;
    private String tone; // nullable for now
    private String goal; // nullable for now
    private LocalDateTime addedAt;
    private LocalDateTime updatedAt;

    // Constructor for creating new profiles (without id and timestamps)
    public ProfileDTO(Long userId, String platform, String username, String profileUrl, 
                     String accessToken, Integer followersCount, String bio, String tone, String goal) {
        this.userId = userId;
        this.platform = platform;
        this.username = username;
        this.profileUrl = profileUrl;
        this.accessToken = accessToken;
        this.followersCount = followersCount;
        this.bio = bio;
        this.tone = tone;
        this.goal = goal;
    }
}


