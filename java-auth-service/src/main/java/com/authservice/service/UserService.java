package com.authservice.service;

import com.authservice.entity.User;
import com.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    /**
     * Find user by email
     */
    public Optional<User> findByEmail(String email) {
        log.debug("Finding user by email: {}", email);
        return userRepository.findByEmail(email);
    }

    /**
     * Find user by Google ID
     */
    public Optional<User> findByGoogleId(String googleId) {
        log.debug("Finding user by Google ID: {}", googleId);
        return userRepository.findByGoogleId(googleId);
    }

    /**
     * Create or update user from Google OAuth2 data
     */
    public User createOrUpdateUser(String email, String name, String googleId) {
        log.info("Creating or updating user: email={}, name={}, googleId={}", email, name, googleId);
        
        // Check if user exists by Google ID
        Optional<User> existingUser = userRepository.findByGoogleId(googleId);
        
        if (existingUser.isPresent()) {
            // Update existing user
            User user = existingUser.get();
            user.setEmail(email);
            user.setName(name);
            log.info("Updated existing user: {}", user.getId());
            return userRepository.save(user);
        } else {
            // Create new user
            User newUser = new User(email, name, googleId);
            User savedUser = userRepository.save(newUser);
            log.info("Created new user: {}", savedUser.getId());
            return savedUser;
        }
    }

    /**
     * Check if user exists by email
     */
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Check if user exists by Google ID
     */
    public boolean existsByGoogleId(String googleId) {
        return userRepository.existsByGoogleId(googleId);
    }

    /**
     * Get user by ID
     */
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
}
