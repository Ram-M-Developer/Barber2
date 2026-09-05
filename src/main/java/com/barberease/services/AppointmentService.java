package com.barberease.services;

import com.barberease.models.*;
import com.barberease.repositories.*;
import com.barberease.websocket.BarberWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class AppointmentService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ChairRepository chairRepository;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private BarberWebSocketHandler webSocketHandler;

    public synchronized String generateTokenNumber(LocalDate date) {
        Optional<Token> lastToken = tokenRepository.findFirstByTokenDateOrderByIdDesc(date);
        int nextNumber = 1;

        if (lastToken.isPresent() && lastToken.get().getTokenNumber() != null) {
            String lastNumStr = lastToken.get().getTokenNumber();
            if (lastNumStr.startsWith("T")) {
                try {
                    nextNumber = Integer.parseInt(lastNumStr.substring(1)) + 1;
                } catch (NumberFormatException e) {
                    // Ignore and use 1
                }
            }
        }

        return String.format("T%03d", nextNumber);
    }

    public Appointment createAppointment(Long customerId, Long serviceId, Long chairId, 
                                         LocalDate appointmentDate, String timeSlot, 
                                         String notes, String paymentMethod) {
        
        com.barberease.models.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found or inactive"));

        if (!service.isActive()) {
            throw new IllegalArgumentException("Service not found or inactive");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        BigDecimal price = service.getPrice();
        boolean isWalletPayment = paymentMethod == null || "redeem".equals(paymentMethod);

        if (isWalletPayment) {
            BigDecimal balance = customer.getWalletBalance();
            if (balance.compareTo(price) < 0) {
                throw new IllegalStateException(String.format(
                        "Insufficient wallet balance. Service costs $%.2f but your wallet has $%.2f. Please top up!",
                        price, balance));
            }
            customer.setWalletBalance(balance.subtract(price));
            customerRepository.save(customer);
        }

        Chair chair = chairRepository.findById(chairId)
                .orElseThrow(() -> new IllegalArgumentException("Chair is not available. Please select another chair."));

        if (!chair.isActive() || (!"available".equals(chair.getStatus()) && 
                (chair.getReservedByCustomer() == null || !chair.getReservedByCustomer().getId().equals(customerId)))) {
            throw new IllegalStateException("Chair is not available. Please select another chair.");
        }

        // Check for duplicate booking (same customer, same date, active status)
        List<String> activeStatuses = Arrays.asList("pending", "confirmed", "in_progress");
        Optional<Appointment> duplicate = appointmentRepository.findByCustomerIdAndAppointmentDateAndStatusIn(
                customerId, appointmentDate, activeStatuses);

        if (duplicate.isPresent()) {
            throw new IllegalStateException("You already have an active appointment for this date");
        }

        String tokenNumber = generateTokenNumber(appointmentDate);

        Appointment appointment = new Appointment();
        appointment.setCustomer(customer);
        appointment.setService(service);
        appointment.setChair(chair);
        appointment.setTokenNumber(tokenNumber);
        appointment.setAppointmentDate(appointmentDate);
        appointment.setTimeSlot(timeSlot);
        appointment.setStatus("confirmed");
        appointment.setNotes(notes);
        Appointment saved = appointmentRepository.save(appointment);

        // Update chair status to occupied
        chair.setStatus("occupied");
        chair.setReservedByCustomer(customer);
        chair.setReservedAt(LocalDateTime.now());
        chairRepository.save(chair);

        // Create token record
        Token token = new Token();
        token.setTokenNumber(tokenNumber);
        token.setCustomer(customer);
        token.setAppointment(saved);
        token.setType("appointment");
        token.setTokenDate(appointmentDate);
        token.setStatus("active");
        tokenRepository.save(token);

        webSocketHandler.broadcast("chair-update");
        webSocketHandler.broadcast("appointment-update");

        return saved;
    }

    public Appointment getAppointmentById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
    }

    public List<Appointment> getCustomerAppointments(Long customerId) {
        return appointmentRepository.findByCustomerIdOrderByAppointmentDateDescCreatedAtDesc(customerId);
    }

    public List<Appointment> getAllAppointments(LocalDate date, String status, Long customerId) {
        // Find all and filter in memory or via customized repository calls (for simplicity, do a custom filter or query)
        List<Appointment> all = appointmentRepository.findAll();
        List<Appointment> filtered = new ArrayList<>();
        
        for (Appointment a : all) {
            if (date != null && !a.getAppointmentDate().equals(date)) continue;
            if (status != null && !a.getStatus().equals(status)) continue;
            if (customerId != null && !a.getCustomer().getId().equals(customerId)) continue;
            filtered.add(a);
        }
        
        // Sort: Date DESC, TimeSlot ASC
        filtered.sort((a, b) -> {
            int dateCompare = b.getAppointmentDate().compareTo(a.getAppointmentDate());
            if (dateCompare != 0) return dateCompare;
            return a.getTimeSlot().compareTo(b.getTimeSlot());
        });
        
        return filtered;
    }

    public List<Appointment> getTodayAppointments() {
        return appointmentRepository.findByAppointmentDateOrderByTimeSlotAsc(LocalDate.now());
    }

    public Appointment cancelAppointment(Long appointmentId, Long customerId) {
        Appointment appointment = getAppointmentById(appointmentId);

        if (customerId != null && !appointment.getCustomer().getId().equals(customerId)) {
            throw new IllegalArgumentException("Access denied. You do not own this appointment.");
        }

        if (Arrays.asList("completed", "cancelled").contains(appointment.getStatus())) {
            throw new IllegalStateException("Appointment is already " + appointment.getStatus());
        }

        appointment.setStatus("cancelled");
        Appointment saved = appointmentRepository.save(appointment);

        // Release the chair
        if (appointment.getChair() != null) {
            Chair chair = appointment.getChair();
            chair.setStatus("available");
            chair.setReservedByCustomer(null);
            chair.setReservedAt(null);
            chairRepository.save(chair);
        }

        // Cancel token
        Optional<Token> tokenOpt = tokenRepository.findByTokenNumber(appointment.getTokenNumber());
        if (tokenOpt.isPresent()) {
            Token token = tokenOpt.get();
            token.setStatus("cancelled");
            tokenRepository.save(token);
        }

        webSocketHandler.broadcast("chair-update");
        webSocketHandler.broadcast("appointment-update");

        return saved;
    }

    public Appointment completeAppointment(Long appointmentId) {
        Appointment appointment = getAppointmentById(appointmentId);

        if ("completed".equals(appointment.getStatus())) {
            throw new IllegalStateException("Appointment is already completed");
        }

        appointment.setStatus("completed");
        appointment.setCompletedAt(LocalDateTime.now());
        Appointment saved = appointmentRepository.save(appointment);

        // Release the chair
        if (appointment.getChair() != null) {
            Chair chair = appointment.getChair();
            chair.setStatus("available");
            chair.setReservedByCustomer(null);
            chair.setReservedAt(null);
            chairRepository.save(chair);
        }

        // Complete token
        Optional<Token> tokenOpt = tokenRepository.findByTokenNumber(appointment.getTokenNumber());
        if (tokenOpt.isPresent()) {
            Token token = tokenOpt.get();
            token.setStatus("used");
            tokenRepository.save(token);
        }

        webSocketHandler.broadcast("chair-update");
        webSocketHandler.broadcast("appointment-update");

        return saved;
    }

    public Appointment startAppointment(Long appointmentId) {
        Appointment appointment = getAppointmentById(appointmentId);
        appointment.setStatus("in_progress");
        appointment.setStartedAt(LocalDateTime.now());
        Appointment saved = appointmentRepository.save(appointment);

        webSocketHandler.broadcast("appointment-update");
        return saved;
    }
}
