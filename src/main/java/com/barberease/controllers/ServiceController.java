package com.barberease.controllers;

import com.barberease.models.Service;
import com.barberease.services.ServiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServiceController {

    @Autowired
    private ServiceService serviceService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        List<Service> services = serviceService.getAllServices();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", services);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/admin/all")
    public ResponseEntity<Map<String, Object>> getAllAdmin() {
        List<Service> services = serviceService.getAllServicesAdmin();

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", services);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        Service service = serviceService.getServiceById(id);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", service);
        return ResponseEntity.ok(body);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Service service) {
        Service created = serviceService.createService(service);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Service created");
        body.put("data", created);
        return new ResponseEntity<>(body, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Service service) {
        Service updated = serviceService.updateService(id, service);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Service updated");
        body.put("data", updated);
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        serviceService.deleteService(id);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Service deactivated successfully");
        return ResponseEntity.ok(body);
    }
}
