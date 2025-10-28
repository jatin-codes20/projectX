package com.authservice.enums;

public enum PlatformType {
    INSTAGRAM("instagram"),
    X("x"),
    FACEBOOK("facebook"),
    LINKEDIN("linkedin"),
    TIKTOK("tiktok");
    
    private final String value;
    
    PlatformType(String value) {
        this.value = value;
    }
    
    public String getValue() {
        return value;
    }
    
    @Override
    public String toString() {
        return value;
    }
}
