package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImmediatePostRequest {
    @NotBlank(message = "Content cannot be blank")
    private String content;

    @NotNull(message = "Profile ID cannot be null")
    private Long profileId;

    private String imageUrl; // Optional for Twitter, required for Instagram

    @NotBlank(message = "Platform cannot be blank")
    private String platform; // "x", "twitter", "instagram"
}

