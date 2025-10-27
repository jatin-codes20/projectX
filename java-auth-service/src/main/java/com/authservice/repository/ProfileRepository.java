package com.authservice.repository;

import com.authservice.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, Long> {

    /**
     * Find all profiles for a specific user
     */
    List<Profile> findByUserId(Long userId);

    /**
     * Find a specific profile by user ID and platform
     */
    Optional<Profile> findByUserIdAndPlatform(Long userId, String platform);

    /**
     * Delete a profile by user ID and platform
     */
    void deleteByUserIdAndPlatform(Long userId, String platform);

    /**
     * Check if a profile exists for a user and platform
     */
    boolean existsByUserIdAndPlatform(Long userId, String platform);

    /**
     * Count profiles for a specific user
     */
    long countByUserId(Long userId);
}


