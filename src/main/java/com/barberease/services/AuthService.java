package com.barberease.services;

import com.barberease.models.Admin;
import com.barberease.models.Customer;
import com.barberease.repositories.AdminRepository;
import com.barberease.repositories.CustomerRepository;
import com.barberease.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class AuthService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    public Map<String, Object> registerCustomer(Customer customerData) {
        Optional<Customer> existing = customerRepository.findByEmail(customerData.getEmail());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        customerData.setPassword(passwordEncoder.encode(customerData.getPassword()));
        Customer saved = customerRepository.save(customerData);

        String token = jwtUtils.generateToken(saved.getId(), saved.getEmail(), "customer", "customer");

        Map<String, Object> result = new HashMap<>();
        result.put("customer", saved);
        result.put("token", token);
        return result;
    }

    public Map<String, Object> loginCustomer(String email, String password) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!customer.isActive()) {
            throw new IllegalStateException("Account is deactivated. Contact support.");
        }

        if (!passwordEncoder.matches(password, customer.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        customer.setLastLogin(LocalDateTime.now());
        customerRepository.save(customer);

        String token = jwtUtils.generateToken(customer.getId(), customer.getEmail(), "customer", "customer");

        Map<String, Object> result = new HashMap<>();
        result.put("customer", customer);
        result.put("token", token);
        return result;
    }

    public Map<String, Object> loginAdmin(String username, String password) {
        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!admin.isActive()) {
            throw new IllegalStateException("Admin account is deactivated.");
        }

        if (!passwordEncoder.matches(password, admin.getPassword())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        admin.setLastLogin(LocalDateTime.now());
        adminRepository.save(admin);

        String token = jwtUtils.generateToken(admin.getId(), admin.getEmail(), admin.getRole(), "admin");

        Map<String, Object> result = new HashMap<>();
        result.put("admin", admin);
        result.put("token", token);
        return result;
    }

    public Map<String, Object> resetPassword(String email, String newPassword) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No account found with this email"));

        customer.setPassword(passwordEncoder.encode(newPassword));
        customerRepository.save(customer);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Password reset successfully");
        return result;
    }
}
