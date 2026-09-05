package com.barberease.controllers;

import com.barberease.models.Admin;
import com.barberease.models.Customer;
import com.barberease.security.UserPrincipal;
import com.barberease.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Customer customer) {
        Map<String, Object> data = authService.registerCustomer(customer);
        
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Registration successful");
        body.put("data", data);
        return new ResponseEntity<>(body, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        Map<String, Object> data = authService.loginCustomer(email, password);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Login successful");
        body.put("data", data);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        Map<String, Object> data = authService.loginAdmin(username, password);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Admin login successful");
        body.put("data", data);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> request) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "If an account with this email exists, a password reset link has been sent.");
        return ResponseEntity.ok(body);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String newPassword = request.get("newPassword");

        Map<String, Object> data = authService.resetPassword(email, newPassword);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", data.get("message"));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "Access denied. No token provided.");
            return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
        }

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", principal.getId());
        userData.put("email", principal.getEmail());
        userData.put("role", principal.getRole());
        userData.put("type", principal.getType());

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", userData);
        return ResponseEntity.ok(body);
    }
}
