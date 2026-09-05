package com.barberease.security;

public class UserPrincipal {
    private final Long id;
    private final String email;
    private final String role;
    private final String type;

    public UserPrincipal(Long id, String email, String role, String type) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.type = type;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getType() {
        return type;
    }
}
