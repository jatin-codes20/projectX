package com.authservice.enums;

public enum PostStatus {
    PENDING,      // Waiting to be posted
    PROCESSING,   // Currently being posted
    PUBLISHED,    // Successfully posted
    FAILED        // Failed to post (after retries)
}

