package com.authservice.controller;

import com.authservice.entity.User;
import com.authservice.service.UserService;
import com.authservice.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    /**
     * Get current user profile using JWT token
     */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getUserProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract JWT token from Authorization header
            String token = authHeader.replace("Bearer ", "");
            
            // Validate token and extract user info
            String email = jwtUtil.getEmailFromToken(token);
            
            // Get user from database
            Optional<User> user = userService.findByEmail(email);
            
            if (user.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("user", Map.of(
                    "id", user.get().getId(),
                    "email", user.get().getEmail(),
                    "name", user.get().getName(),
                    "googleId", user.get().getGoogleId(),
                    "createdAt", user.get().getCreatedAt()
                ));
                
                log.info("User profile retrieved for: {}", email);
                return ResponseEntity.ok(response);
            } else {
                log.warn("User not found in database: {}", email);
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            log.error("Error retrieving user profile", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Invalid token or user not found");
            return ResponseEntity.status(401).body(errorResponse);
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "auth-service");
        return ResponseEntity.ok(response);
    }
}
