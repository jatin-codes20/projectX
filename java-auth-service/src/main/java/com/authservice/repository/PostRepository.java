package com.authservice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.authservice.entity.Post;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    /**
     * Find all posts for a specific profile
     */
    List<Post> findByProfileId(Long profileId);

    /**
     * Delete all posts for a specific profile
     */
    void deleteAllById(Long profileId);

    /**
     * Delete a specific post
     */
    void deleteById(Long id);

    /**
     * Delete all posts
     */
    void deleteAll();
}
