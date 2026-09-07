package com.barberease.controllers;

import com.barberease.models.Appointment;
import com.barberease.security.UserPrincipal;
import com.barberease.services.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

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

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> request) {
        Long customerId = getAuthenticatedCustomerId();

        Long serviceId = parseId(request.get("service_id"));
        Long chairId = parseId(request.get("chair_id"));
        
        String dateStr = (String) request.get("appointment_date");
        LocalDate appointmentDate = LocalDate.parse(dateStr);

        String timeSlot = (String) request.get("time_slot");
        String notes = (String) request.get("notes");
        String paymentMethod = (String) request.get("payment_method");

        Appointment created = appointmentService.createAppointment(
                customerId, serviceId, chairId, appointmentDate, timeSlot, notes, paymentMethod);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Appointment confirmed");
        body.put("data", created);
        return new ResponseEntity<>(body, HttpStatus.CREATED);
    }

    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> getMy() {
        Long customerId = getAuthenticatedCustomerId();
        List<Appointment> appts = appointmentService.getCustomerAppointments(customerId);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", appts);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/slots")
    public ResponseEntity<Map<String, Object>> getSlots(
            @RequestParam(name = "chairId", required = false) Long chairId,
            @RequestParam(name = "date", required = false) String dateStr) {
        
        LocalDate date = (dateStr != null && !dateStr.isEmpty()) ? LocalDate.parse(dateStr) : LocalDate.now();
        List<String> bookedSlots = appointmentService.getBookedSlots(chairId, date);

        Map<String, Object> data = new HashMap<>();
        data.put("chairId", chairId);
        data.put("date", date.toString());
        data.put("bookedSlots", bookedSlots);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", data);
        return ResponseEntity.ok(body);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String status,
            @RequestParam(name = "customer_id", required = false) Long customerId) {
        
        LocalDate localDate = date != null ? LocalDate.parse(date) : null;
        List<Appointment> appts = appointmentService.getAllAppointments(localDate, status, customerId);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", appts);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable Long id) {
        Long customerId = null;
        if ("customer".equals(getAuthenticatedUserType())) {
            customerId = getAuthenticatedCustomerId();
        }

        Appointment cancelled = appointmentService.cancelAppointment(id, customerId);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Appointment cancelled successfully");
        body.put("data", cancelled);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Map<String, Object>> complete(@PathVariable Long id) {
        Appointment completed = appointmentService.completeAppointment(id);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Appointment completed");
        body.put("data", completed);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<Map<String, Object>> start(@PathVariable Long id) {
        Appointment started = appointmentService.startAppointment(id);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Appointment started");
        body.put("data", started);
        return ResponseEntity.ok(body);
    }
}
