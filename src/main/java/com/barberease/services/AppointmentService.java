package com.barberease.services;

import com.barberease.models.*;
import com.barberease.models.Queue;
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
    private QueueRepository queueRepository;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private QueueService queueService;

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
                .orElseThrow(() -> new IllegalArgumentException("Chair not found. Please select a valid chair."));

        if (!chair.isActive() || "maintenance".equals(chair.getStatus())) {
            throw new IllegalStateException("Chair station is currently out of service. Please select another chair.");
        }

        // Check if the chair has an overlapping appointment for THIS specific time slot and duration
        List<String> activeStatuses = Arrays.asList("pending", "confirmed", "in_progress");
        int newStartMin = parseTimeToMinutes(timeSlot);
        int newDuration = (service != null && service.getDurationMinutes() > 0) ? service.getDurationMinutes() : 30;
        int newEndMin = newStartMin + newDuration;

        List<Appointment> chairAppts = appointmentRepository.findByChairId(chairId);
        for (Appointment exist : chairAppts) {
            if (exist.getAppointmentDate() != null && exist.getAppointmentDate().equals(appointmentDate)
                    && activeStatuses.contains(exist.getStatus())) {
                int existStartMin = parseTimeToMinutes(exist.getTimeSlot());
                if (existStartMin >= 0) {
                    int existDuration = (exist.getService() != null && exist.getService().getDurationMinutes() > 0)
                            ? exist.getService().getDurationMinutes() : 30;
                    int existEndMin = existStartMin + existDuration;

                    // Overlap check: max(newStartMin, existStartMin) < min(newEndMin, existEndMin)
                    if (Math.max(newStartMin, existStartMin) < Math.min(newEndMin, existEndMin)) {
                        String existStartStr = formatMinutesToTime(existStartMin);
                        String existEndStr = formatMinutesToTime(existEndMin);
                        throw new IllegalStateException(String.format(
                                "Time slot %s (%d min) conflicts with an existing appointment (%s to %s) on %s. The next booking is available after %s.",
                                timeSlot, newDuration, existStartStr, existEndStr, chair.getName(), existEndStr));
                    }
                }
            }
        }

        // Check if customer already has an appointment booked for the exact same time slot on this date
        boolean customerAlreadyBooked = appointmentRepository.existsByCustomerIdAndAppointmentDateAndTimeSlotAndStatusIn(
                customerId, appointmentDate, timeSlot, activeStatuses);

        if (customerAlreadyBooked) {
            throw new IllegalStateException("You already have an appointment booked for " + timeSlot + " on this date.");
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

        // Clear temporary checkout hold so other customers can book remaining time slots on this chair
        chair.setStatus("available");
        chair.setReservedByCustomer(null);
        chair.setReservedAt(null);
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

    public static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return -1;
        }
        try {
            String clean = timeStr.trim().toUpperCase();
            boolean isPm = clean.contains("PM");
            clean = clean.replace("AM", "").replace("PM", "").trim();
            String[] parts = clean.split(":");
            int hour = Integer.parseInt(parts[0].trim());
            int min = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 0;
            if (isPm && hour != 12) {
                hour += 12;
            } else if (!isPm && hour == 12) {
                hour = 0;
            }
            return hour * 60 + min;
        } catch (Exception e) {
            return -1;
        }
    }

    public static String formatMinutesToTime(int totalMinutes) {
        int hour = totalMinutes / 60;
        int min = totalMinutes % 60;
        int displayHour = hour % 12 == 0 ? 12 : hour % 12;
        String period = hour < 12 ? "AM" : "PM";
        return String.format("%d:%02d %s", displayHour, min, period);
    }

    public List<String> getBookedSlots(Long chairId, LocalDate date) {
        List<Appointment> appts;
        if (chairId != null) {
            appts = appointmentRepository.findByChairId(chairId);
        } else {
            appts = appointmentRepository.findByAppointmentDateOrderByTimeSlotAsc(date);
        }
        Set<String> booked = new LinkedHashSet<>();
        List<String> activeStatuses = Arrays.asList("pending", "confirmed", "in_progress");

        for (Appointment a : appts) {
            if (a.getAppointmentDate() != null && a.getAppointmentDate().equals(date) && activeStatuses.contains(a.getStatus())) {
                if (a.getTimeSlot() != null) {
                    int startMin = parseTimeToMinutes(a.getTimeSlot());
                    if (startMin >= 0) {
                        int duration = 30;
                        if (a.getService() != null && a.getService().getDurationMinutes() > 0) {
                            duration = a.getService().getDurationMinutes();
                        }
                        int endMin = startMin + duration;

                        // Add all standard 30-minute intervals that overlap with [startMin, endMin)
                        // Standard salon hours: 8:00 AM (480 min) to 10:00 PM (1320 min)
                        for (int t = 480; t < 1320; t += 30) {
                            if (t < endMin && (t + 30) > startMin) {
                                booked.add(formatMinutesToTime(t));
                            }
                        }
                    } else {
                        booked.add(a.getTimeSlot());
                    }
                }
            }
        }
        return new ArrayList<>(booked);
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

        // Cancel token and any associated queue
        boolean queueCancelled = false;
        List<Token> cancelTokens = tokenRepository.findByAppointmentId(appointment.getId());
        if (cancelTokens.isEmpty() && appointment.getTokenNumber() != null) {
            cancelTokens = tokenRepository.findByTokenNumber(appointment.getTokenNumber());
        }
        for (Token token : cancelTokens) {
            token.setStatus("cancelled");
            tokenRepository.save(token);
            if (token.getQueue() != null) {
                Queue q = token.getQueue();
                if (!"completed".equals(q.getStatus()) && !"cancelled".equals(q.getStatus())) {
                    q.setStatus("cancelled");
                    q.setCompletedAt(LocalDateTime.now());
                    queueRepository.save(q);
                    queueCancelled = true;
                }
            }
        }

        if (appointment.getTokenNumber() != null) {
            List<Queue> matching = queueRepository.findByTokenNumber(appointment.getTokenNumber());
            for (Queue q : matching) {
                if (!"completed".equals(q.getStatus()) && !"cancelled".equals(q.getStatus())) {
                    q.setStatus("cancelled");
                    q.setCompletedAt(LocalDateTime.now());
                    queueRepository.save(q);
                    queueCancelled = true;
                }
            }
        }

        if (queueCancelled && queueService != null) {
            queueService.recalculatePositions();
            webSocketHandler.broadcast("queue-update");
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
        Chair freedChair = null;
        if (appointment.getChair() != null) {
            freedChair = appointment.getChair();
            freedChair.setStatus("available");
            freedChair.setReservedByCustomer(null);
            freedChair.setReservedAt(null);
            chairRepository.save(freedChair);
        }

        // Complete token and any associated queue entries
        boolean queueCompleted = false;
        List<Token> completeTokens = tokenRepository.findByAppointmentId(appointment.getId());
        if (completeTokens.isEmpty() && appointment.getTokenNumber() != null) {
            completeTokens = tokenRepository.findByTokenNumber(appointment.getTokenNumber());
        }
        for (Token token : completeTokens) {
            token.setStatus("used");
            tokenRepository.save(token);
            if (token.getQueue() != null) {
                Queue q = token.getQueue();
                if (!"completed".equals(q.getStatus()) && !"cancelled".equals(q.getStatus())) {
                    q.setStatus("completed");
                    q.setCompletedAt(LocalDateTime.now());
                    queueRepository.save(q);
                    queueCompleted = true;
                }
            }
        }

        if (appointment.getTokenNumber() != null) {
            List<Queue> matching = queueRepository.findByTokenNumber(appointment.getTokenNumber());
            for (Queue q : matching) {
                if (!"completed".equals(q.getStatus()) && !"cancelled".equals(q.getStatus())) {
                    q.setStatus("completed");
                    q.setCompletedAt(LocalDateTime.now());
                    queueRepository.save(q);
                    queueCompleted = true;
                }
            }
        }

        if (appointment.getCustomer() != null) {
            List<Queue> custQueues = queueRepository.findAllByCustomerIdAndStatusIn(
                    appointment.getCustomer().getId(), Arrays.asList("waiting", "called", "serving"));
            for (Queue q : custQueues) {
                q.setStatus("completed");
                q.setCompletedAt(LocalDateTime.now());
                if (q.getChair() != null) {
                    Chair qc = q.getChair();
                    qc.setStatus("available");
                    qc.setReservedByCustomer(null);
                    qc.setReservedAt(null);
                    chairRepository.save(qc);
                }
                queueRepository.save(q);
                queueCompleted = true;
            }
        }

        if (queueCompleted && queueService != null) {
            queueService.recalculatePositions();
        }

        // ── Auto-call next waiting customer from global token queue ──
        if (queueService != null) {
            Map<String, Object> called = queueService.callNextCustomer();
            if (called != null) {
                webSocketHandler.broadcast("queue-update");
                webSocketHandler.broadcast("chair-update");
                webSocketHandler.broadcast("appointment-update");
                return saved;
            }
        }

        webSocketHandler.broadcast("queue-update");
        webSocketHandler.broadcast("chair-update");
        webSocketHandler.broadcast("appointment-update");

        return saved;
    }

    public Appointment startAppointment(Long appointmentId) {
        Appointment appointment = getAppointmentById(appointmentId);
        appointment.setStatus("in_progress");
        appointment.setStartedAt(LocalDateTime.now());

        // Assign chair if not assigned yet
        if (appointment.getChair() == null) {
            Chair availableChair = chairRepository.findByStatusAndIsActiveTrueOrderByChairNumberAsc("available")
                    .stream().findFirst().orElse(null);
            if (availableChair != null) {
                appointment.setChair(availableChair);
            }
        }

        Appointment saved = appointmentRepository.save(appointment);

        if (appointment.getChair() != null) {
            Chair chair = appointment.getChair();
            chair.setStatus("occupied");
            chair.setReservedByCustomer(appointment.getCustomer());
            chair.setReservedAt(LocalDateTime.now());
            chairRepository.save(chair);
            webSocketHandler.broadcast("chair-update");
        }

        // ── SYNC TO USER QUEUE: Advance status to 'serving' (SEATED) ──
        boolean queueUpdated = false;
        // 1. By token number
        if (appointment.getTokenNumber() != null) {
            List<Queue> matching = queueRepository.findByTokenNumber(appointment.getTokenNumber());
            for (Queue q : matching) {
                if (!"completed".equalsIgnoreCase(q.getStatus()) && !"cancelled".equalsIgnoreCase(q.getStatus())) {
                    q.setStatus("serving");
                    q.setChair(appointment.getChair());
                    q.setServedAt(LocalDateTime.now());
                    queueRepository.save(q);
                    queueUpdated = true;
                }
            }
        }
        // 2. By customer ID (active queue entries for this customer today)
        if (appointment.getCustomer() != null) {
            List<Queue> custQueues = queueRepository.findAllByCustomerIdAndStatusIn(
                    appointment.getCustomer().getId(), Arrays.asList("waiting", "called"));
            for (Queue q : custQueues) {
                q.setStatus("serving");
                q.setChair(appointment.getChair());
                q.setServedAt(LocalDateTime.now());
                queueRepository.save(q);
                queueUpdated = true;
            }
        }

        if (queueUpdated && queueService != null) {
            queueService.recalculatePositions();
        }

        webSocketHandler.broadcast("queue-update");
        webSocketHandler.broadcast("appointment-update");
        return saved;
    }
}
