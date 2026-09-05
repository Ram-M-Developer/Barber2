package com.barberease.services;

import com.barberease.models.*;
import com.barberease.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class ReportService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ChairRepository chairRepository;

    @Autowired
    private QueueRepository queueRepository;

    public Map<String, Object> getDailyReport(LocalDate date) {
        List<Appointment> appts = appointmentRepository.findByAppointmentDateOrderByTimeSlotAsc(date);

        int total = appts.size();
        int completed = 0;
        int cancelled = 0;
        int pending = 0;
        int inProgress = 0;
        BigDecimal revenue = BigDecimal.ZERO;

        for (Appointment a : appts) {
            String status = a.getStatus();
            if ("completed".equals(status)) {
                completed++;
                if (a.getService() != null && a.getService().getPrice() != null) {
                    revenue = revenue.add(a.getService().getPrice());
                }
            } else if ("cancelled".equals(status)) {
                cancelled++;
            } else if ("in_progress".equals(status)) {
                inProgress++;
            } else if ("pending".equals(status) || "confirmed".equals(status)) {
                pending++;
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("date", date.toString());
        summary.put("total", total);
        summary.put("completed", completed);
        summary.put("cancelled", cancelled);
        summary.put("pending", pending);
        summary.put("inProgress", inProgress);
        summary.put("revenue", revenue);
        summary.put("appointments", appts);

        return summary;
    }

    public Map<String, Object> getMonthlyReport(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        List<Appointment> appts = appointmentRepository.findByAppointmentDateBetween(startDate, endDate);

        int total = appts.size();
        int completed = 0;
        int cancelled = 0;
        BigDecimal revenue = BigDecimal.ZERO;

        for (Appointment a : appts) {
            String status = a.getStatus();
            if ("completed".equals(status)) {
                completed++;
                if (a.getService() != null && a.getService().getPrice() != null) {
                    revenue = revenue.add(a.getService().getPrice());
                }
            } else if ("cancelled".equals(status)) {
                cancelled++;
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("year", year);
        summary.put("month", month);
        summary.put("total", total);
        summary.put("completed", completed);
        summary.put("cancelled", cancelled);
        summary.put("revenue", revenue);

        return summary;
    }

    public List<Map<String, Object>> getChairUtilization() {
        List<Chair> chairs = chairRepository.findByIsActiveTrueOrderByChairNumberAsc();
        List<Map<String, Object>> utilization = new ArrayList<>();

        for (Chair chair : chairs) {
            List<Appointment> appts = appointmentRepository.findByChairId(chair.getId());
            long total = appts.size();
            long completed = appts.stream().filter(a -> "completed".equals(a.getStatus())).count();

            Map<String, Object> map = new HashMap<>();
            map.put("chair_number", chair.getChairNumber());
            map.put("name", chair.getName());
            map.put("status", chair.getStatus());
            map.put("total_appointments", total);
            map.put("completed_appointments", completed);

            utilization.add(map);
        }

        return utilization;
    }

    public List<Appointment> getCustomerVisitHistory(Long customerId) {
        return appointmentRepository.findByCustomerIdOrderByAppointmentDateDescCreatedAtDesc(customerId);
    }

    public List<Map<String, Object>> getPeakBookingHours() {
        List<Appointment> appts = appointmentRepository.findAll();
        Map<String, Integer> slotCounts = new HashMap<>();

        List<String> validStatuses = Arrays.asList("confirmed", "in_progress", "completed");
        for (Appointment a : appts) {
            if (validStatuses.contains(a.getStatus()) && a.getTimeSlot() != null) {
                String slot = a.getTimeSlot();
                slotCounts.put(slot, slotCounts.getOrDefault(slot, 0) + 1);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : slotCounts.entrySet()) {
            Map<String, Object> m = new HashMap<>();
            m.put("time_slot", entry.getKey());
            m.put("count", entry.getValue());
            result.add(m);
        }

        result.sort((a, b) -> ((Integer) b.get("count")).compareTo((Integer) a.get("count")));
        return result;
    }

    public List<Map<String, Object>> getServicePopularity() {
        List<com.barberease.models.Service> services = serviceRepository.findByIsActiveTrueOrderByCategoryAscNameAsc();
        List<Map<String, Object>> popularity = new ArrayList<>();

        for (com.barberease.models.Service service : services) {
            long count = appointmentRepository.findAll().stream()
                    .filter(a -> a.getService() != null && a.getService().getId().equals(service.getId()))
                    .count();

            Map<String, Object> map = new HashMap<>();
            map.put("service_id", service.getId());
            map.put("name", service.getName());
            map.put("price", service.getPrice());
            map.put("total_bookings", count);
            popularity.add(map);
        }

        popularity.sort((a, b) -> ((Long) b.get("total_bookings")).compareTo((Long) a.get("total_bookings")));
        return popularity;
    }

    public Map<String, Object> getDashboardStats() {
        LocalDate today = LocalDate.now();

        long todayAppointments = appointmentRepository.countByAppointmentDate(today);
        long todayCompleted = appointmentRepository.countByAppointmentDateAndStatus(today, "completed");
        long totalCustomers = customerRepository.count();

        List<Appointment> completed = appointmentRepository.findByStatus("completed");
        BigDecimal revenue = BigDecimal.ZERO;
        for (Appointment a : completed) {
            if (a.getService() != null && a.getService().getPrice() != null) {
                revenue = revenue.add(a.getService().getPrice());
            }
        }

        long queueWaiting = queueRepository.countByStatus("waiting");

        Map<String, Object> stats = new HashMap<>();
        stats.put("todayAppointments", todayAppointments);
        stats.put("todayCompleted", todayCompleted);
        stats.put("totalCustomers", totalCustomers);
        stats.put("totalRevenue", revenue.setScale(2, BigDecimal.ROUND_HALF_UP).toString());
        stats.put("queueWaiting", queueWaiting);

        return stats;
    }
}
