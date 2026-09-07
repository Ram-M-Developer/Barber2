package com.barberease.controllers;

import com.barberease.models.Chair;
import com.barberease.security.UserPrincipal;
import com.barberease.services.ChairService;
import com.barberease.websocket.BarberWebSocketHandler;
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
@RequestMapping("/api/chairs")
public class ChairController {

    @Autowired
    private ChairService chairService;

    @Autowired
    private com.barberease.services.AppointmentService appointmentService;

    @Autowired
    private com.barberease.repositories.AppointmentRepository appointmentRepository;

    @Autowired
    private BarberWebSocketHandler webSocketHandler;

    private Long getAuthenticatedCustomerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            throw new IllegalArgumentException("Authentication required");
        }
        return ((UserPrincipal) auth.getPrincipal()).getId();
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        List<Chair> chairs = chairService.getAllChairs();
        List<Map<String, Object>> enriched = new java.util.ArrayList<>();

        for (Chair chair : chairs) {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", chair.getId());
            map.put("chair_number", chair.getChairNumber());
            map.put("name", "Seat " + chair.getChairNumber());
            String customerName = "---";
            String timeSlot = "---";
            Long appointmentId = null;

            List<com.barberease.models.Appointment> appts = appointmentRepository.findByChairId(chair.getId());
            for (com.barberease.models.Appointment a : appts) {
                if (("confirmed".equalsIgnoreCase(a.getStatus()) || "in_progress".equalsIgnoreCase(a.getStatus()))
                        && a.getAppointmentDate() != null && a.getAppointmentDate().equals(java.time.LocalDate.now())) {
                    if (a.getCustomer() != null) {
                        customerName = a.getCustomer().getName();
                    }
                    if (a.getTimeSlot() != null) {
                        timeSlot = a.getTimeSlot();
                    }
                    appointmentId = a.getId();
                    break;
                }
            }

            if ("---".equals(customerName) && chair.getReservedByCustomer() != null) {
                customerName = chair.getReservedByCustomer().getName();
                if (chair.getReservedAt() != null) {
                    timeSlot = chair.getReservedAt().format(java.time.format.DateTimeFormatter.ofPattern("h:mm a"));
                }
            }

            String status = chair.getStatus();
            if (!"---".equals(customerName) && ("available".equalsIgnoreCase(status) || "reserved".equalsIgnoreCase(status))) {
                status = "occupied";
            }

            map.put("status", status);
            map.put("is_active", chair.isActive());
            map.put("customer_name", customerName);
            map.put("time", timeSlot);
            map.put("appointment_id", appointmentId);
            map.put("reserved_by_customer", chair.getReservedByCustomer());
            enriched.add(map);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", enriched);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/available")
    public ResponseEntity<Map<String, Object>> getAvailable() {
        List<Chair> chairs = chairService.getAvailableChairs();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", chairs);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Integer> stats = chairService.getChairStats();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", stats);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        Chair chair = chairService.getChairById(id);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", chair);
        return ResponseEntity.ok(body);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Chair chair) {
        Chair created = chairService.createChair(chair);
        webSocketHandler.broadcast("chair-update");

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Chair created");
        body.put("data", created);
        return new ResponseEntity<>(body, HttpStatus.CREATED);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String status = request.get("status");
        Chair chair = chairService.updateChairStatus(id, status);
        webSocketHandler.broadcast("chair-update");

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Chair status updated");
        body.put("data", chair);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/reserve")
    public ResponseEntity<Map<String, Object>> reserve(@PathVariable Long id) {
        Long customerId = getAuthenticatedCustomerId();
        Chair chair = chairService.reserveChair(id, customerId);
        webSocketHandler.broadcast("chair-update");

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Chair reserved for 5 minutes");
        body.put("data", chair);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/release")
    public ResponseEntity<Map<String, Object>> release(@PathVariable Long id) {
        Long customerId = getAuthenticatedCustomerId();
        Chair chair = chairService.releaseChair(id, customerId);
        webSocketHandler.broadcast("chair-update");

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Chair released successfully");
        body.put("data", chair);
        return ResponseEntity.ok(body);
    }

    private void verifyAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            throw new org.springframework.security.access.AccessDeniedException("Admin authentication required");
        }
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        if (!"admin".equalsIgnoreCase(principal.getType()) && !"admin".equalsIgnoreCase(principal.getRole())) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied: Admin role required");
        }
    }

    @PostMapping("/{id}/complete-service")
    public ResponseEntity<Map<String, Object>> completeService(@PathVariable Long id) {
        verifyAdmin();
        Chair chair = appointmentService.completeSeatService(id);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Seat service completed and next customer seated");
        body.put("data", chair);
        return ResponseEntity.ok(body);
    }
}
