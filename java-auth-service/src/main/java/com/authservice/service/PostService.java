package com.authservice.service;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.authservice.entity.Post;

import com.authservice.repository.PostRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PostService {

    private final PostRepository postRepository;

    /**
     * Create a new post
     */
    public Post createPost(Post post) {
        return postRepository.save(post);
    }
    /**
     * Get all posts for a specific profile
     */
    public List<Post> getPostsByProfileId(Long profileId) {
        return postRepository.findByProfileId(profileId);
    }

    /**
     * Get recent posts for a user (across all their profiles)
     * @param userId The user ID
     * @param limit Maximum number of posts to return (default 20)
     * @return List of recent posts ordered by creation date (newest first)
     */
    public List<Post> getRecentPostsForUser(Long userId, int limit) {
        // PageRequest.of(0, limit) means: "Give me the first page with 'limit' number of items"
        // This is like SQL: LIMIT limit
        Pageable pageable = PageRequest.of(0, limit);
        return postRepository.findRecentPostsByUserId(userId, pageable);
    }       

    /**
     * Delete all posts for a specific profile
     */
    public void deleteAllPostsByProfileId(Long profileId) {
        postRepository.deleteAllById(profileId);
    }
    /**
     * Delete a specific post
     */
    public void deletePostById(Long id) {
        postRepository.deleteById(id);
    }


    

    /**
     * Delete a specific post
     */
}
