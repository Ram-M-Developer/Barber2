package com.barberease.services;

import com.barberease.models.*;
import com.barberease.repositories.*;
import com.barberease.websocket.BarberWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.List;
import java.util.Arrays;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Service
@Transactional
public class QueueService {

    @Autowired
    private QueueRepository queueRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ChairRepository chairRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private BarberWebSocketHandler webSocketHandler;

    @Autowired
    private AppointmentService appointmentService;

    public Queue addToQueue(Long customerId, Long serviceId) {
        com.barberease.models.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found or inactive"));

        if (!service.isActive()) {
            throw new IllegalArgumentException("Service not found or inactive");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Optional<Queue> existing = queueRepository.findByCustomerIdAndStatusIn(
                customerId, Arrays.asList("waiting", "called"));
        
        if (existing.isPresent()) {
            throw new IllegalStateException("You are already in the queue");
        }

        // Find last position
        Optional<Queue> last = queueRepository.findFirstByStatusInOrderByPositionDesc(
                Arrays.asList("waiting", "called"));
        
        int position = last.map(q -> q.getPosition() + 1).orElse(1);

        String tokenNumber = appointmentService.generateTokenNumber(LocalDate.now());

        int avgDuration = service.getDurationMinutes() > 0 ? service.getDurationMinutes() : 30;
        int estimatedWait = Math.max(0, (position - 1) * avgDuration);

        Queue queue = new Queue();
        queue.setCustomer(customer);
        queue.setService(service);
        queue.setTokenNumber(tokenNumber);
        queue.setPosition(position);
        queue.setStatus("waiting");
        queue.setEstimatedWaitMinutes(estimatedWait);
        Queue saved = queueRepository.save(queue);

        // Create token
        Token token = new Token();
        token.setTokenNumber(tokenNumber);
        token.setCustomer(customer);
        token.setQueue(saved);
        token.setType("queue");
        token.setTokenDate(LocalDate.now());
        token.setStatus("active");
        tokenRepository.save(token);

        webSocketHandler.broadcast("queue-update");

        return saved;
    }

    public List<Queue> getActiveQueue() {
        return queueRepository.findByStatusInOrderByPositionAsc(
                Arrays.asList("waiting", "called", "serving"));
    }

    public Queue getCustomerQueueStatus(Long customerId) {
        return queueRepository.findByCustomerIdAndStatusIn(
                customerId, Arrays.asList("waiting", "called", "serving")).orElse(null);
    }

    public Map<String, Object> callNextCustomer() {
        // Find available chair
        Chair availableChair = chairRepository.findByStatusAndIsActiveTrueOrderByChairNumberAsc("available")
                .stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No chairs available at this time"));

        // Find next waiting in queue
        Queue nextEntry = queueRepository.findFirstByStatusOrderByPositionAsc("waiting")
                .orElseThrow(() -> new IllegalStateException("No customers waiting in queue"));

        // Update queue status
        nextEntry.setStatus("serving");
        nextEntry.setCalledAt(LocalDateTime.now());
        nextEntry.setServedAt(LocalDateTime.now());
        queueRepository.save(nextEntry);

        // Occupy chair
        availableChair.setStatus("occupied");
        availableChair.setReservedByCustomer(nextEntry.getCustomer());
        availableChair.setReservedAt(LocalDateTime.now());
        chairRepository.save(availableChair);

        // Create appointment
        Appointment appointment = new Appointment();
        appointment.setCustomer(nextEntry.getCustomer());
        appointment.setService(nextEntry.getService());
        appointment.setChair(availableChair);
        appointment.setTokenNumber(nextEntry.getTokenNumber());
        appointment.setAppointmentDate(LocalDate.now());
        
        String timeStr = LocalTime.now().format(DateTimeFormatter.ofPattern("h:mm a"));
        appointment.setTimeSlot(timeStr);
        appointment.setStatus("in_progress");
        appointment.setStartedAt(LocalDateTime.now());
        Appointment savedAppointment = appointmentRepository.save(appointment);

        // Update token
        Optional<Token> tokenOpt = tokenRepository.findByTokenNumber(nextEntry.getTokenNumber());
        if (tokenOpt.isPresent()) {
            Token token = tokenOpt.get();
            token.setAppointment(savedAppointment);
            token.setStatus("used");
            tokenRepository.save(token);
        }

        recalculatePositions();

        webSocketHandler.broadcast("chair-update");
        webSocketHandler.broadcast("queue-update");
        webSocketHandler.broadcast("appointment-update");

        Map<String, Object> result = new HashMap<>();
        result.put("queueEntry", nextEntry);
        result.put("chair", availableChair);
        result.put("appointment", savedAppointment);
        return result;
    }

    public Queue cancelQueueEntry(Long queueId, Long customerId) {
        Queue entry = queueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found"));

        if (customerId != null && !entry.getCustomer().getId().equals(customerId)) {
            throw new IllegalArgumentException("Access denied. You do not own this queue entry.");
        }

        if (Arrays.asList("completed", "cancelled").contains(entry.getStatus())) {
            throw new IllegalStateException("Queue entry is already " + entry.getStatus());
        }

        entry.setStatus("cancelled");
        entry.setCompletedAt(LocalDateTime.now());
        Queue saved = queueRepository.save(entry);

        // Cancel token
        Optional<Token> tokenOpt = tokenRepository.findByTokenNumber(entry.getTokenNumber());
        if (tokenOpt.isPresent()) {
            Token token = tokenOpt.get();
            token.setStatus("cancelled");
            tokenRepository.save(token);
        }

        recalculatePositions();

        webSocketHandler.broadcast("queue-update");

        return saved;
    }

    public void recalculatePositions() {
        List<Queue> waiting = queueRepository.findByStatusOrderByCreatedAtAsc("waiting");
        for (int i = 0; i < waiting.size(); i++) {
            Queue entry = waiting.get(i);
            int newPos = i + 1;
            entry.setPosition(newPos);
            entry.setEstimatedWaitMinutes(Math.max(0, (newPos - 1) * 30));
            queueRepository.save(entry);
        }
    }

    public Map<String, Object> getQueueStats() {
        long waiting = queueRepository.countByStatus("waiting");
        long serving = queueRepository.countByStatus("serving");
        
        LocalDateTime cutoff = LocalDate.now().atStartOfDay();
        long todayCompleted = queueRepository.countByStatusAndCompletedAtAfter("completed", cutoff);

        Map<String, Object> stats = new HashMap<>();
        stats.put("waiting", waiting);
        stats.put("serving", serving);
        stats.put("todayCompleted", todayCompleted);
        return stats;
    }
}
