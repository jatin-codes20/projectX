package com.authservice.repository;

import com.authservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Find user by email
    Optional<User> findByEmail(String email);
    
    // Find user by Google ID
    Optional<User> findByGoogleId(String googleId);
    
    // Check if email exists
    boolean existsByEmail(String email);
    
    // Check if Google ID exists
    boolean existsByGoogleId(String googleId);
}



