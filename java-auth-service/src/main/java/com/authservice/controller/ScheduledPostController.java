package com.authservice.controller;

import com.authservice.dto.CreateScheduledPostRequest;
import com.authservice.dto.ScheduledPostResponse;
import com.authservice.service.ScheduledPostService;
import com.authservice.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/scheduled-posts")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ScheduledPostController {

    private final ScheduledPostService scheduledPostService;
    private final JwtUtil jwtUtil;

    /**
     * Create a new scheduled post
     */
    @PostMapping
    public ResponseEntity<?> createScheduledPost(
            @RequestBody @Valid CreateScheduledPostRequest request,
            HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Creating scheduled post for user ID: {}", userId);
            ScheduledPostResponse response = scheduledPostService.createScheduledPost(userId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            log.error("Error creating scheduled post: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Get all scheduled posts for the authenticated user
     */
    @GetMapping
    public ResponseEntity<?> getScheduledPosts(HttpServletRequest request) {
        try {
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Fetching scheduled posts for user ID: {}", userId);
            List<ScheduledPostResponse> posts = scheduledPostService.getScheduledPosts(userId);
            return ResponseEntity.ok(Map.of("posts", posts, "count", posts.size()));

        } catch (Exception e) {
            log.error("Error fetching scheduled posts: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Get a specific scheduled post by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getScheduledPost(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Fetching scheduled post ID: {} for user ID: {}", id, userId);
            Optional<ScheduledPostResponse> post = scheduledPostService.getScheduledPost(id, userId);

            if (post.isPresent()) {
                return ResponseEntity.ok(post.get());
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Not Found", "message", "Scheduled post not found"));
            }

        } catch (Exception e) {
            log.error("Error fetching scheduled post: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Update a scheduled post
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateScheduledPost(
            @PathVariable Long id,
            @RequestBody @Valid CreateScheduledPostRequest request,
            HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Updating scheduled post ID: {} for user ID: {}", id, userId);
            ScheduledPostResponse response = scheduledPostService.updateScheduledPost(id, userId, request);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            // Handle business logic errors (e.g., post not found, cannot update)
            log.warn("Business logic error updating scheduled post: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error updating scheduled post: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Delete a scheduled post
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteScheduledPost(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Deleting scheduled post ID: {} for user ID: {}", id, userId);
            scheduledPostService.deleteScheduledPost(id, userId);
            return ResponseEntity.ok(Map.of("message", "Scheduled post deleted successfully"));

        } catch (RuntimeException e) {
            // Handle business logic errors (e.g., post not found, cannot delete)
            log.warn("Business logic error deleting scheduled post: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting scheduled post: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Manually trigger a scheduled post for immediate execution (for testing/debugging)
     */
    @PostMapping("/{id}/trigger")
    public ResponseEntity<?> triggerScheduledPost(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Manually triggering scheduled post ID: {} for user ID: {}", id, userId);
            scheduledPostService.triggerScheduledPost(id, userId);
            return ResponseEntity.ok(Map.of("message", "Scheduled post triggered successfully"));

        } catch (RuntimeException e) {
            // Handle business logic errors (e.g., post not found, cannot trigger)
            log.warn("Business logic error triggering scheduled post: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error triggering scheduled post: {}", e.getMessage(), e);
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

