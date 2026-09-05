package com.barberease.controllers;

import com.barberease.models.Appointment;
import com.barberease.services.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = reportService.getDashboardStats();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", stats);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/daily")
    public ResponseEntity<Map<String, Object>> getDaily(@RequestParam String date) {
        LocalDate localDate = LocalDate.parse(date);
        Map<String, Object> summary = reportService.getDailyReport(localDate);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", summary);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/monthly")
    public ResponseEntity<Map<String, Object>> getMonthly(@RequestParam int year, @RequestParam int month) {
        Map<String, Object> summary = reportService.getMonthlyReport(year, month);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", summary);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/chairs")
    public ResponseEntity<Map<String, Object>> getChairsReport() {
        List<Map<String, Object>> list = reportService.getChairUtilization();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/customers/{id}/history")
    public ResponseEntity<Map<String, Object>> getCustomerHistory(@PathVariable Long id) {
        List<Appointment> list = reportService.getCustomerVisitHistory(id);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/peak-hours")
    public ResponseEntity<Map<String, Object>> getPeakHours() {
        List<Map<String, Object>> list = reportService.getPeakBookingHours();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/services")
    public ResponseEntity<Map<String, Object>> getServicesReport() {
        List<Map<String, Object>> list = reportService.getServicePopularity();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", list);
        return ResponseEntity.ok(body);
    }
}
