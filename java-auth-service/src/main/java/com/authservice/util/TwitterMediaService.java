package com.authservice.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Response;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth10aService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Service for handling Twitter/X media upload operations
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class TwitterMediaService implements ITwitterMediaService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public String uploadMedia(String mediaUrl, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception {
        log.info("Uploading media to Twitter from URL: {}", mediaUrl);
        
        try {
            // Download media using RestTemplate (handles redirects, errors better)
            ResponseEntity<byte[]> mediaResponse = restTemplate.getForEntity(mediaUrl, byte[].class);
            if (!mediaResponse.getStatusCode().is2xxSuccessful()) {
                log.warn("Failed to download media from URL: {} - Status: {}", mediaUrl, mediaResponse.getStatusCode());
                return null;
            }
            
            byte[] mediaBytes = mediaResponse.getBody();
            if (mediaBytes == null || mediaBytes.length == 0) {
                log.warn("Downloaded media is empty from URL: {}", mediaUrl);
                return null;
            }
            
            // Determine content type from response headers
            HttpHeaders headers = mediaResponse.getHeaders();
            String contentType = headers.getContentType() != null ? headers.getContentType().toString() : "";
            
            // Check URL for video patterns (Cloudinary URLs, etc.)
            String urlLower = mediaUrl.toLowerCase();
            boolean isVideo = contentType.contains("video/") || 
                             urlLower.contains("/video/") ||
                             urlLower.endsWith(".mp4") || 
                             urlLower.endsWith(".mov") ||
                             urlLower.endsWith(".mpeg") ||
                             urlLower.endsWith(".avi") ||
                             urlLower.endsWith(".webm") ||
                             urlLower.contains("video/upload") || // Cloudinary video URLs
                             urlLower.contains("video_upload"); // Alternative Cloudinary pattern
            
            // Additional check: Check file signature/magic bytes for video formats
            if (!isVideo && mediaBytes.length >= 12) {
                // MP4 file signature: 00 00 00 XX 66 74 79 70 (ftyp)
                // Or: 00 00 00 18 66 74 79 70 6D 70 34 32 (mp42)
                if ((mediaBytes[4] == 0x66 && mediaBytes[5] == 0x74 && mediaBytes[6] == 0x79 && mediaBytes[7] == 0x70) ||
                    (mediaBytes[4] == 0x66 && mediaBytes[5] == 0x74 && mediaBytes[6] == 0x79 && mediaBytes[7] == 0x70 && 
                     mediaBytes[8] == 0x6D && mediaBytes[9] == 0x70 && mediaBytes[10] == 0x34 && mediaBytes[11] == 0x32)) {
                    isVideo = true;
                    log.info("Detected video by file signature (MP4)");
                }
            }
            
            // All videos require chunked upload (Twitter API requirement)
            // Images can use simple upload
            long fileSize = mediaBytes.length;
            
            if (isVideo) {
                log.info("Video detected ({} bytes, content-type: {}), using chunked upload", fileSize, contentType);
                return uploadVideo(mediaBytes, service, oauthToken);
            } else {
                log.info("Image detected ({} bytes, content-type: {}), using simple upload", fileSize, contentType);
                return uploadImage(mediaBytes, service, oauthToken);
            }
            
        } catch (Exception e) {
            log.error("Error uploading media to Twitter: {}", e.getMessage(), e);
            return null;
        }
    }

    @Override
    public String uploadImage(byte[] imageBytes, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception {
        // Twitter media upload endpoint (v1.1)
        OAuthRequest uploadRequest = new OAuthRequest(Verb.POST, "https://upload.twitter.com/1.1/media/upload.json");
        
        // Add image as base64 encoded binary
        String base64Image = java.util.Base64.getEncoder().encodeToString(imageBytes);
        uploadRequest.addParameter("media_data", base64Image);
        
        // Sign and execute upload request
        service.signRequest(oauthToken, uploadRequest);
        Response uploadResponse = service.execute(uploadRequest);
        
        if (uploadResponse.getCode() == 200 || uploadResponse.getCode() == 201) {
            JsonNode uploadJson = objectMapper.readTree(uploadResponse.getBody());
            String mediaId = uploadJson.get("media_id_string").asText();
            log.info("Successfully uploaded image to Twitter. Media ID: {}", mediaId);
            return mediaId;
        } else {
            log.warn("Failed to upload image to Twitter: {} - {}", uploadResponse.getCode(), uploadResponse.getBody());
            return null;
        }
    }

    @Override
    public String uploadVideo(byte[] videoBytes, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception {
        // Step 1: INIT - Initialize chunked upload
        OAuthRequest initRequest = new OAuthRequest(Verb.POST, "https://upload.twitter.com/1.1/media/upload.json");
        initRequest.addParameter("command", "INIT");
        initRequest.addParameter("total_bytes", String.valueOf(videoBytes.length));
        initRequest.addParameter("media_type", "video/mp4");
        initRequest.addParameter("media_category", "tweet_video");
        
        service.signRequest(oauthToken, initRequest);
        Response initResponse = service.execute(initRequest);
        
        // Check if response contains media_id_string (success indicator)
        // Twitter may return various success codes (200, 201, 202, etc.)
        String initResponseBody = initResponse.getBody();
        log.info("INIT response code: {}, body: {}", initResponse.getCode(), initResponseBody);
        
        JsonNode initJson;
        try {
            initJson = objectMapper.readTree(initResponseBody);
        } catch (Exception e) {
            // If response is not JSON or not 2xx, it's an error
            if (initResponse.getCode() < 200 || initResponse.getCode() >= 300) {
                throw new RuntimeException("Failed to initialize chunked upload: HTTP " + initResponse.getCode() + " - " + initResponseBody);
            }
            throw new RuntimeException("Failed to parse INIT response: " + initResponseBody, e);
        }
        
        // Check if response contains media_id_string (success indicator)
        if (!initJson.has("media_id_string")) {
            // If no media_id_string, check if it's an error response
            if (initJson.has("error") || initResponse.getCode() >= 400) {
                throw new RuntimeException("Failed to initialize chunked upload: HTTP " + initResponse.getCode() + " - " + initResponseBody);
            }
            throw new RuntimeException("INIT response missing media_id_string: " + initResponseBody);
        }
        
        String mediaId = initJson.get("media_id_string").asText();
        log.info("Initialized chunked upload. Media ID: {}", mediaId);
        
        // Step 2: APPEND - Upload chunks (5MB chunks)
        int chunkSize = 5 * 1024 * 1024; // 5MB
        int segmentIndex = 0;
        int offset = 0;
        
        while (offset < videoBytes.length) {
            int currentChunkSize = Math.min(chunkSize, videoBytes.length - offset);
            byte[] chunk = new byte[currentChunkSize];
            System.arraycopy(videoBytes, offset, chunk, 0, currentChunkSize);
            
            OAuthRequest appendRequest = new OAuthRequest(Verb.POST, "https://upload.twitter.com/1.1/media/upload.json");
            appendRequest.addParameter("command", "APPEND");
            appendRequest.addParameter("media_id", mediaId);
            appendRequest.addParameter("segment_index", String.valueOf(segmentIndex));
            
            // Add chunk as base64 - Twitter API expects "media_data" parameter
            String base64Chunk = java.util.Base64.getEncoder().encodeToString(chunk);
            appendRequest.addParameter("media_data", base64Chunk);
            
            service.signRequest(oauthToken, appendRequest);
            Response appendResponse = service.execute(appendRequest);
            
            if (appendResponse.getCode() != 200 && appendResponse.getCode() != 201 && appendResponse.getCode() != 204) {
                throw new RuntimeException("Failed to append chunk " + segmentIndex + ": " + appendResponse.getBody());
            }
            
            log.debug("Appended chunk {} ({} bytes)", segmentIndex, currentChunkSize);
            segmentIndex++;
            offset += currentChunkSize;
        }
        
        // Step 3: FINALIZE - Finalize upload
        OAuthRequest finalizeRequest = new OAuthRequest(Verb.POST, "https://upload.twitter.com/1.1/media/upload.json");
        finalizeRequest.addParameter("command", "FINALIZE");
        finalizeRequest.addParameter("media_id", mediaId);
        
        service.signRequest(oauthToken, finalizeRequest);
        Response finalizeResponse = service.execute(finalizeRequest);
        
        if (finalizeResponse.getCode() != 200 && finalizeResponse.getCode() != 201) {
            throw new RuntimeException("Failed to finalize upload: " + finalizeResponse.getBody());
        }
        
        log.info("Finalized chunked upload. Media ID: {}", mediaId);
        
        // Step 4: Wait for video processing
        return waitForVideoProcessing(mediaId, service, oauthToken);
    }

    @Override
    public String waitForVideoProcessing(String mediaId, OAuth10aService service, OAuth1AccessToken oauthToken) throws Exception {
        int maxAttempts = 30; // Max 30 attempts (5 minutes with 10 second intervals)
        int attempt = 0;
        
        while (attempt < maxAttempts) {
            // Check status first (don't sleep on first attempt)
            if (attempt > 0) {
                try {
                    Thread.sleep(10000); // Wait 10 seconds between checks
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while waiting for video processing", e);
                }
            }
            
            OAuthRequest statusRequest = new OAuthRequest(Verb.GET, "https://upload.twitter.com/1.1/media/upload.json");
            statusRequest.addParameter("command", "STATUS");
            statusRequest.addParameter("media_id", mediaId);
            
            service.signRequest(oauthToken, statusRequest);
            Response statusResponse = service.execute(statusRequest);
            
            if (statusResponse.getCode() == 200 || statusResponse.getCode() == 201) {
                JsonNode statusJson = objectMapper.readTree(statusResponse.getBody());
                JsonNode processingInfo = statusJson.get("processing_info");
                
                if (processingInfo != null) {
                    String state = processingInfo.get("state").asText();
                    if ("succeeded".equals(state)) {
                        log.info("Video processing succeeded. Media ID: {}", mediaId);
                        return mediaId;
                    } else if ("failed".equals(state)) {
                        String errorMsg = processingInfo.has("error") ? processingInfo.get("error").toString() : "Unknown error";
                        throw new RuntimeException("Video processing failed: " + errorMsg + " - " + processingInfo.toString());
                    } else {
                        // Still processing (pending, in_progress)
                        log.info("Video processing state: {} (attempt {}/{})", state, attempt + 1, maxAttempts);
                        // Log progress info if available
                        if (processingInfo.has("progress_percent")) {
                            int progress = processingInfo.get("progress_percent").asInt();
                            log.info("Video processing progress: {}%", progress);
                        }
                        // Check if there's a check_after_secs hint from Twitter
                        if (processingInfo.has("check_after_secs")) {
                            int waitSeconds = processingInfo.get("check_after_secs").asInt();
                            log.info("Twitter suggests checking again after {} seconds", waitSeconds);
                        }
                    }
                } else {
                    // No processing_info means it's ready (for images or already processed videos)
                    log.info("No processing_info found - media is ready. Media ID: {}", mediaId);
                    return mediaId;
                }
            } else {
                log.warn("Failed to check video processing status: {} - {}", statusResponse.getCode(), statusResponse.getBody());
            }
            
            attempt++;
        }
        
        throw new RuntimeException("Video processing timeout after " + maxAttempts + " attempts (5 minutes)");
    }
}

