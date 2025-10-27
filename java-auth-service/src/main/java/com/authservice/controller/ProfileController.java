package com.authservice.controller;

import com.authservice.dto.ProfileDTO;
import com.authservice.service.ProfileService;
import com.authservice.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
@Slf4j
public class ProfileController {

    private final ProfileService profileService;
    private final JwtUtil jwtUtil;

    /**
     * Create or update a profile
     */
    @PostMapping
    public ResponseEntity<?> createOrUpdateProfile(@RequestBody ProfileDTO profileDTO, HttpServletRequest request) {
        try {
            log.info("=== CREATE OR UPDATE PROFILE CALLED ===");
            log.info("Creating or updating profile for platform: {}", profileDTO.getPlatform());
            
            // Extract user ID from JWT token
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                log.warn("Unauthorized request - no user ID extracted");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            // Set the user ID from the token
            profileDTO.setUserId(userId);

            ProfileDTO savedProfile = profileService.createOrUpdateProfile(profileDTO);
            log.info("Profile created/updated successfully with ID: {}", savedProfile.getId());

            return ResponseEntity.ok(savedProfile);

        } catch (Exception e) {
            log.error("Error creating or updating profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Get all profiles for the authenticated user
     */
    @GetMapping("/user")
    public ResponseEntity<?> getProfilesForUser(HttpServletRequest request) {
        try {
            // Extract user ID from JWT token
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Fetching profiles for user ID: {}", userId);
            List<ProfileDTO> profiles = profileService.getProfilesByUserId(userId);
            log.info("Found {} profiles for user ID: {}", profiles.size(), userId);

            return ResponseEntity.ok(Map.of("profiles", profiles, "count", profiles.size()));

        } catch (Exception e) {
            log.error("Error fetching profiles for user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Get a specific profile by platform for the authenticated user
     */
    @GetMapping("/user/platform/{platform}")
    public ResponseEntity<?> getProfileByPlatform(@PathVariable String platform, HttpServletRequest request) {
        try {
            // Extract user ID from JWT token
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Fetching profile for user ID: {} and platform: {}", userId, platform);
            Optional<ProfileDTO> profile = profileService.getProfileByUserIdAndPlatform(userId, platform);

            if (profile.isPresent()) {
                return ResponseEntity.ok(profile.get());
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Not Found", "message", "Profile not found for platform: " + platform));
            }

        } catch (Exception e) {
            log.error("Error fetching profile by platform", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Delete a profile by platform for the authenticated user
     */
    @DeleteMapping("/user/platform/{platform}")
    public ResponseEntity<?> deleteProfileByPlatform(@PathVariable String platform, HttpServletRequest request) {
        try {
            // Extract user ID from JWT token
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            log.info("Deleting profile for user ID: {} and platform: {}", userId, platform);
            
            // Check if profile exists
            if (!profileService.profileExists(userId, platform)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Not Found", "message", "Profile not found for platform: " + platform));
            }

            profileService.deleteProfile(userId, platform);
            log.info("Profile deleted successfully for user ID: {} and platform: {}", userId, platform);

            return ResponseEntity.ok(Map.of("message", "Profile deleted successfully"));

        } catch (Exception e) {
            log.error("Error deleting profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Get profile count for the authenticated user
     */
    @GetMapping("/user/count")
    public ResponseEntity<?> getProfileCount(HttpServletRequest request) {
        try {
            // Extract user ID from JWT token
            Long userId = extractUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized", "message", "Invalid or missing authentication token"));
            }

            long count = profileService.getProfileCount(userId);
            return ResponseEntity.ok(Map.of("count", count));

        } catch (Exception e) {
            log.error("Error getting profile count", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Extract user ID from JWT token in request
     */
    private Long extractUserIdFromRequest(HttpServletRequest request) {
        try {
            log.info("Extracting user ID from request...");
            String token = null;
            
            // First try to get token from Authorization header
            String authHeader = request.getHeader("Authorization");
            log.info("Authorization header: {}", authHeader != null ? "present" : "missing");
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
                log.info("Extracted token from Authorization header (length: {})", token.length());
            } else {
                // Fallback: try to get JWT token from cookies
                Cookie[] cookies = request.getCookies();
                log.info("Cookies present: {}", cookies != null);
                
                if (cookies != null) {
                    for (Cookie cookie : cookies) {
                        log.info("Found cookie: {}", cookie.getName());
                        if ("auth-token".equals(cookie.getName())) {
                            token = cookie.getValue();
                            log.info("Extracted token from cookie (length: {})", token.length());
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
            boolean isValid = jwtUtil.validateToken(token);
            log.info("Token validation result: {}", isValid);
            
            if (isValid) {
                Long userId = jwtUtil.getUserIdFromToken(token);
                log.info("Extracted user ID: {} from token", userId);
                return userId;
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


