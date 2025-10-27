package com.authservice.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
@Slf4j
public class PublicController {

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        log.info("Health check requested");
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "auth-service");
        response.put("timestamp", String.valueOf(System.currentTimeMillis()));
        return ResponseEntity.ok(response);
    }

    /**
     * Service info endpoint
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, String>> info() {
        Map<String, String> response = new HashMap<>();
        response.put("name", "Authentication Service");
        response.put("version", "1.0.0");
        response.put("description", "OAuth2 authentication service for social media management app");
        return ResponseEntity.ok(response);
    }

    /**
     * Success page for OAuth2 authentication
     */
    @GetMapping("/success")
    public ResponseEntity<Map<String, String>> success() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Authentication successful! JWT token has been set as a cookie.");
        response.put("next", "You can now use the authenticated endpoints.");
        return ResponseEntity.ok(response);
    }

    /**
     * Error page for OAuth2 authentication
     */
    @GetMapping("/error")
    public ResponseEntity<Map<String, String>> error() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", "Authentication failed. Please try again.");
        return ResponseEntity.ok(response);
    }
}
