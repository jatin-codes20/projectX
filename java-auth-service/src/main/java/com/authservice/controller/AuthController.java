package com.authservice.controller;

import com.authservice.entity.User;
import com.authservice.service.UserService;
import com.authservice.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Controller
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    /**
     * Handle successful OAuth2 authentication
     */
    @GetMapping("/success")
    public void authSuccess(@AuthenticationPrincipal OidcUser oidcUser, HttpServletResponse response) throws IOException {
        log.info("=== OAuth2 SUCCESS CALLBACK CALLED ===");
        log.info("OAuth2 authentication successful for user: {}", oidcUser != null ? oidcUser.getEmail() : "null");
        
        try {
            // Extract user information from Google OAuth2
            String email = oidcUser.getEmail();
            String name = oidcUser.getFullName();
            String googleId = oidcUser.getSubject();
            
            log.info("User details - Email: {}, Name: {}, Google ID: {}", email, name, googleId);
            
            // Create or update user in database
            User user = userService.createOrUpdateUser(email, name, googleId);
            log.info("User saved to database with ID: {}", user.getId());
            
            // Generate JWT token
            String jwtToken = jwtUtil.generateToken(email, name, googleId, user.getId());
            log.info("JWT token generated for user: {}", email);
            
            // Set secure HTTP-only cookie
            Cookie cookie = new Cookie("auth-token", jwtToken);
            cookie.setHttpOnly(true);        // Prevents XSS attacks
            cookie.setSecure(false);         // Set to true in production with HTTPS
            cookie.setPath("/");             // Available to all paths
            cookie.setMaxAge(86400);         // 24 hours
            response.addCookie(cookie);
            
            // Redirect to the connect page where users can connect social media accounts
            String redirectUrl = "http://localhost:3000/connect?auth=success";
            log.info("Redirecting to: {} with secure cookie", redirectUrl);
            
            response.sendRedirect(redirectUrl);
            
        } catch (Exception e) {
            log.error("Error during authentication success handling", e);
            response.sendRedirect("http://localhost:3000/connect?auth=error");
        }
    }

    /**
     * Handle failed OAuth2 authentication
     */
    @GetMapping("/failure")
    public void authFailure(HttpServletResponse response) throws IOException {
        log.warn("OAuth2 authentication failed");
        response.sendRedirect("http://localhost:3000?error=auth_failed");
    }

    /**
     * Handle logout
     */
    @GetMapping("/logout")
    public void logout(HttpServletResponse response) throws IOException {
        log.info("User logout requested");
        response.sendRedirect("http://localhost:3000?logout=true");
    }

    /**
     * Handle logout success
     */
    @GetMapping("/logout-success")
    public void logoutSuccess(HttpServletResponse response) throws IOException {
        log.info("User logout successful");
        response.sendRedirect("http://localhost:3000?logout=true");
    }
}
