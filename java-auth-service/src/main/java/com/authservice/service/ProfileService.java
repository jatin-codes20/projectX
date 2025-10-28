package com.authservice.service;

import com.authservice.dto.ProfileDTO;
import com.authservice.enums.PlatformType;
import com.authservice.entity.Profile;
import com.authservice.entity.User;
import com.authservice.repository.ProfileRepository;
import com.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;

    /**
     * Create or update a profile
     */
    public ProfileDTO createOrUpdateProfile(ProfileDTO profileDTO) {
        log.info("Creating or updating profile for user {} and platform {}", 
                profileDTO.getUserId(), profileDTO.getPlatform());

        // Find existing profile
        Optional<Profile> existingProfile = profileRepository
                .findByUserIdAndPlatform(profileDTO.getUserId(), PlatformType.valueOf(profileDTO.getPlatform().toUpperCase()));

        Profile profile;
        if (existingProfile.isPresent()) {
            // Update existing profile
            profile = existingProfile.get();
            log.info("Updating existing profile with ID: {}", profile.getId());
        } else {
            // Create new profile
            profile = new Profile();
            log.info("Creating new profile for user {} and platform {}", 
                    profileDTO.getUserId(), profileDTO.getPlatform());
        }

        // Set user reference
        User user = userRepository.findById(profileDTO.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + profileDTO.getUserId()));
        profile.setUser(user);

        // Update profile fields
        profile.setPlatform(PlatformType.valueOf(profileDTO.getPlatform().toUpperCase()));
        profile.setUsername(profileDTO.getUsername());
        profile.setProfileUrl(profileDTO.getProfileUrl());
        profile.setAccessToken(profileDTO.getAccessToken());
        profile.setFollowersCount(profileDTO.getFollowersCount());
        

        // Save profile
        Profile savedProfile = profileRepository.save(profile);
        log.info("Profile saved successfully with ID: {}", savedProfile.getId());

        return convertToDTO(savedProfile);
    }

    /**
     * Get all profiles for a user
     */
    @Transactional(readOnly = true)
    public List<ProfileDTO> getProfilesByUserId(Long userId) {
        log.info("Fetching profiles for user ID: {}", userId);
        List<Profile> profiles = profileRepository.findByUserId(userId);
        log.info("Found {} profiles for user ID: {}", profiles.size(), userId);
        return profiles.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific profile by user ID and platform
     */
    @Transactional(readOnly = true)
    public Optional<ProfileDTO> getProfileByUserIdAndPlatform(Long userId, String platform) {
        log.info("Fetching profile for user ID: {} and platform: {}", userId, platform);
        Optional<Profile> profile = profileRepository.findByUserIdAndPlatform(userId, PlatformType.valueOf(platform.toUpperCase()));
        return profile.map(this::convertToDTO);
    }

    /**
     * Delete a profile by user ID and platform
     */
    public void deleteProfile(Long userId, String platform) {
        log.info("Deleting profile for user ID: {} and platform: {}", userId, platform);
        profileRepository.deleteByUserIdAndPlatform(userId, PlatformType.valueOf(platform.toUpperCase()));
        log.info("Profile deleted successfully for user ID: {} and platform: {}", userId, platform);
    }

    /**
     * Check if a profile exists for a user and platform
     */
    @Transactional(readOnly = true)
    public boolean profileExists(Long userId, String platform) {
        return profileRepository.existsByUserIdAndPlatform(userId, PlatformType.valueOf(platform.toUpperCase()));
    }

    /**
     * Get count of profiles for a user
     */
    @Transactional(readOnly = true)
    public long getProfileCount(Long userId) {
        return profileRepository.countByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Optional<Profile> getProfileById(Long profileId) {
        log.info("Fetching profile by ID: {}", profileId);
        return profileRepository.findById(profileId);
    }

    /**
     * Convert Profile entity to ProfileDTO
     */
    private ProfileDTO convertToDTO(Profile profile) {
        ProfileDTO dto = new ProfileDTO();
        dto.setId(profile.getId());
        dto.setUserId(profile.getUser().getId());
        dto.setPlatform(profile.getPlatform().getValue());
        dto.setUsername(profile.getUsername());
        dto.setProfileUrl(profile.getProfileUrl());
        dto.setAccessToken(profile.getAccessToken());
        dto.setFollowersCount(profile.getFollowersCount());
        dto.setAddedAt(profile.getAddedAt());
        dto.setUpdatedAt(profile.getUpdatedAt());
        return dto;
    }
}


