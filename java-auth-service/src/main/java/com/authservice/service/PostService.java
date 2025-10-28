package com.authservice.service;

import java.util.List;

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
