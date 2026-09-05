package com.barberease.controllers;

import com.barberease.models.Token;
import com.barberease.repositories.TokenRepository;
import com.barberease.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/tokens")
public class TokenController {

    @Autowired
    private TokenRepository tokenRepository;

    @GetMapping("/{number}")
    public ResponseEntity<Map<String, Object>> getByNumber(@PathVariable String number) {
        Token token = tokenRepository.findByTokenNumber(number)
                .orElseThrow(() -> new IllegalArgumentException("Token not found"));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            throw new IllegalArgumentException("Authentication required");
        }
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();

        if ("customer".equals(principal.getType()) && !token.getCustomer().getId().equals(principal.getId())) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "Access denied. You do not own this token.");
            return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", token);
        return ResponseEntity.ok(body);
    }
}
