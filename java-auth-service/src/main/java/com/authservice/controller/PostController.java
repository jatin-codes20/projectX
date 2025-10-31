package com.authservice.controller;

import com.authservice.dto.CreatePostRequest;
import com.authservice.entity.Post;
import com.authservice.entity.Profile;
import com.authservice.service.PostService;
import com.authservice.service.ProfileService;
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
}