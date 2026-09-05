package com.barberease.controllers;

import com.barberease.models.Queue;
import com.barberease.security.UserPrincipal;
import com.barberease.services.QueueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/queue")
public class QueueController {

    @Autowired
    private QueueService queueService;

    private Long getAuthenticatedCustomerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            throw new IllegalArgumentException("Authentication required");
        }
        return ((UserPrincipal) auth.getPrincipal()).getId();
    }

    private String getAuthenticatedUserType() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            throw new IllegalArgumentException("Authentication required");
        }
        return ((UserPrincipal) auth.getPrincipal()).getType();
    }

    private Long parseId(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        if (value instanceof String) {
            return Long.parseLong((String) value);
        }
        throw new IllegalArgumentException("Invalid ID format");
    }

    @PostMapping("/join")
    public ResponseEntity<Map<String, Object>> join(@RequestBody Map<String, Object> request) {
        Long customerId = getAuthenticatedCustomerId();
        Long serviceId = parseId(request.get("service_id"));

        Queue joined = queueService.addToQueue(customerId, serviceId);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Joined queue successfully");
        body.put("data", joined);
        return new ResponseEntity<>(body, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getActive() {
        List<Queue> active = queueService.getActiveQueue();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", active);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/my-status")
    public ResponseEntity<Map<String, Object>> getMyStatus() {
        Long customerId = getAuthenticatedCustomerId();
        Queue status = queueService.getCustomerQueueStatus(customerId);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", status);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/call-next")
    public ResponseEntity<Map<String, Object>> callNext() {
        Map<String, Object> data = queueService.callNextCustomer();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Called next customer");
        body.put("data", data);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable Long id) {
        Long customerId = null;
        if ("customer".equals(getAuthenticatedUserType())) {
            customerId = getAuthenticatedCustomerId();
        }

        Queue cancelled = queueService.cancelQueueEntry(id, customerId);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Queue entry cancelled");
        body.put("data", cancelled);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = queueService.getQueueStats();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", stats);
        return ResponseEntity.ok(body);
    }
}
