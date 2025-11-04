package com.authservice.controller;

import com.authservice.dto.CreatePostRequest;
import com.authservice.dto.ImmediatePostRequest;
import com.authservice.entity.Post;
import com.authservice.entity.Profile;
import com.authservice.service.MetricsService;
import com.authservice.service.PostExecutionService;
import com.authservice.service.PostService;
import com.authservice.service.ProfileService;
import com.authservice.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PostController {

    private final PostService postService;
    private final ProfileService profileService;
    private final PostExecutionService postExecutionService;
    private final MetricsService metricsService;
    private final JwtUtil jwtUtil;

    /**
     * Create a new post
     */
    @PostMapping
    public ResponseEntity<?> createPost(@RequestBody @Valid CreatePostRequest request) {
        try {
            log.info("Creating new post with content: {} for profile: {}", request.getContent(), request.getProfileId());
            
            // Find the profile by ID from the database
            Optional<Profile> profileOpt = profileService.getProfileById(request.getProfileId());
            if (profileOpt.isEmpty()) {
                log.error("Profile not found with ID: {}", request.getProfileId());
                Map<String, String> error = new HashMap<>();
                error.put("error", "Profile not found with ID: " + request.getProfileId());
                return ResponseEntity.badRequest().body(error);
            }
            
            Profile profile = profileOpt.get();
            log.info("Found profile: {} for platform: {}", profile.getUsername(), profile.getPlatform());
            
            Post post = new Post();
            post.setContent(request.getContent());
            post.setProfile(profile);
            post.setCreatedAt(LocalDateTime.now());
            
            Post createdPost = postService.createPost(post);
            log.info("Successfully created post with ID: {}", createdPost.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(createdPost);
            
        } catch (Exception e) {
            log.error("Error creating post: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("message", "Failed to create post");
            if (e.getCause() != null) {
                error.put("cause", e.getCause().getMessage());
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Get all posts for a specific profile
     */
    @GetMapping("/profile/{profileId}")
    public ResponseEntity<List<Post>> getPostsByProfileId(@PathVariable Long profileId) {
        try {
            log.info("Fetching posts for profile ID: {}", profileId);
            List<Post> posts = postService.getPostsByProfileId(profileId);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            log.error("Error fetching posts for profile {}: {}", profileId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete all posts for a specific profile
     */
    @DeleteMapping("/profile/{profileId}")
    public ResponseEntity<Void> deleteAllPostsByProfileId(@PathVariable Long profileId) {
        try {
            log.info("Deleting all posts for profile ID: {}", profileId);
            postService.deleteAllPostsByProfileId(profileId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting posts for profile {}: {}", profileId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete a specific post
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePostById(@PathVariable Long id) {
        try {
            log.info("Deleting post with ID: {}", id);
            postService.deletePostById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting post {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Post immediately to a platform (Twitter/X or Instagram)
     */
    @PostMapping("/immediate")
    public ResponseEntity<?> postImmediate(
            @RequestBody @Valid ImmediatePostRequest request,
            HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Posting immediately to {} for user ID: {}", request.getPlatform(), userId);
            log.info("Content: {}, ImageUrl: {}", request.getContent(), request.getImageUrl() != null ? request.getImageUrl() : "null");

            // Find the profile
            Optional<Profile> profileOpt = profileService.getProfileById(request.getProfileId());
            if (profileOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Not Found", "message", "Profile not found with ID: " + request.getProfileId()));
            }

            Profile profile = profileOpt.get();

            // Verify the profile belongs to the user
            if (!profile.getUser().getId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "Profile does not belong to user"));
            }

            // Normalize platform name
            String platform = request.getPlatform().toLowerCase();
            if ("twitter".equals(platform)) {
                platform = "x";
            }

            // Verify platform matches profile platform
            if (!profile.getPlatform().getValue().equals(platform)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Bad Request", "message", 
                                "Platform mismatch: profile is for " + profile.getPlatform() + " but request is for " + platform));
            }

            // Post to platform using PostExecutionService
            String platformPostId;
            try {
                log.info("Calling postToPlatformImmediate with content length: {}, imageUrl: {}", 
                        request.getContent() != null ? request.getContent().length() : 0,
                        request.getImageUrl() != null ? request.getImageUrl() : "null");
                platformPostId = postExecutionService.postToPlatformImmediate(
                        request.getContent(),
                        request.getImageUrl(),
                        profile,
                        platform
                );
                log.info("Successfully posted to platform. Platform post ID: {}", platformPostId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Bad Request", "message", e.getMessage()));
            } catch (Exception e) {
                log.error("Failed to post to platform: {}", e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Internal Server Error", "message", "Failed to post to platform: " + e.getMessage()));
            }

            // Create Post entity in database
            Post post = new Post();
            post.setContent(request.getContent());
            post.setProfile(profile);
            post.setCreatedAt(LocalDateTime.now());
            Post createdPost = postService.createPost(post);
            log.info("Successfully created post with ID: {}", createdPost.getId());

            // Try to fetch metrics (may not be immediately available for new posts)
            Map<String, Long> metricsData = new HashMap<>();
            try {
                // For Twitter/X, we can try to fetch metrics immediately
                if ("x".equals(platform) || "twitter".equals(platform)) {
                    // Metrics fetching would require additional API call
                    // For now, initialize with 0s
                    metricsData.put("likes", 0L);
                    metricsData.put("retweets", 0L);
                    metricsData.put("replies", 0L);
                    metricsData.put("quotes", 0L);
                    metricsData.put("impressions", 0L);
                } else if ("instagram".equals(platform)) {
                    metricsData.put("likes", 0L);
                    metricsData.put("comments", 0L);
                    metricsData.put("reach", 0L);
                    metricsData.put("impressions", 0L);
                }
            } catch (Exception e) {
                log.warn("Could not fetch metrics immediately (this is normal for new posts): {}", e.getMessage());
            }

            // Save initial metrics
            if (!metricsData.isEmpty()) {
                try {
                    metricsService.createOrUpdateMetrics(createdPost.getId(), metricsData);
                } catch (Exception e) {
                    log.warn("Failed to save initial metrics: {}", e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully posted to " + platform);
            response.put("postId", createdPost.getId());
            response.put("platformPostId", platformPostId);
            response.put("platform", platform);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error in immediate post: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Get recent posts for the authenticated user
     */
    @GetMapping("/user/recent")
    public ResponseEntity<?> getRecentPostsForUser(
            HttpServletRequest request,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Fetching recent {} posts for user ID: {}", limit, userId);
            List<Post> posts = postService.getRecentPostsForUser(userId, limit);
            
            // Manually map to DTOs to avoid circular references and expose only necessary data
            List<Map<String, Object>> postDTOs = posts.stream().map(post -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", post.getId());
                dto.put("content", post.getContent());
                dto.put("createdAt", post.getCreatedAt());
                // Optionally include platform/username if needed, but avoid full profile object
                if (post.getProfile() != null) {
                    dto.put("platform", post.getProfile().getPlatform().name().toLowerCase());
                    dto.put("username", post.getProfile().getUsername());
                }
                return dto;
            }).collect(java.util.stream.Collectors.toList());
            
            return ResponseEntity.ok(Map.of(
                "posts", postDTOs,
                "count", postDTOs.size()
            ));

        } catch (Exception e) {
            log.error("Error fetching recent posts for user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Extract user ID from JWT token in request
     */
    private Long extractUserIdFromRequest(HttpServletRequest request) {
        try {
            String token = null;

            // First try to get token from Authorization header
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                // Fallback: try to get JWT token from cookies
                Cookie[] cookies = request.getCookies();
                if (cookies != null) {
                    for (Cookie cookie : cookies) {
                        if ("auth-token".equals(cookie.getName())) {
                            token = cookie.getValue();
                            break;
                        }
                    }
                }
            }

            if (token == null) {
                log.warn("No authentication token found in request");
                return null;
            }

            // Validate and extract user ID from token
            if (jwtUtil.validateToken(token)) {
                return jwtUtil.getUserIdFromToken(token);
            } else {
                log.warn("Invalid or expired token");
                return null;
            }

        } catch (Exception e) {
            log.error("Error extracting user ID from request", e);
            return null;
        }
    }
}