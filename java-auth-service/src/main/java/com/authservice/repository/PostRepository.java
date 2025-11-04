package com.authservice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.authservice.entity.Post;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    /**
     * Find all posts for a specific profile
     */
    List<Post> findByProfileId(Long profileId);

    /**
     * Find recent posts for a user (across all their profiles), ordered by creation date descending
     * @param userId The user ID
     * @param limit Maximum number of posts to return
     * @return List of recent posts
     */
    @Query("SELECT p FROM Post p JOIN p.profile pr WHERE pr.user.id = :userId ORDER BY p.createdAt DESC")
    List<Post> findRecentPostsByUserId(@Param("userId") Long userId, org.springframework.data.domain.Pageable pageable);

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
