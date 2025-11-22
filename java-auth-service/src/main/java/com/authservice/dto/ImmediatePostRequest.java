package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImmediatePostRequest {
    @NotBlank(message = "Content cannot be blank")
    private String content;

    @NotNull(message = "Profile ID cannot be null")
    private Long profileId;

    private List<String> mediaUrls; // Optional: array of media URLs (images and/or videos)

    @NotBlank(message = "Platform cannot be blank")
    private String platform; // "x", "twitter", "instagram"
}

