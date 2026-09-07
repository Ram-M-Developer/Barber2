package com.barberease.repositories;

import com.barberease.models.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByCustomerIdOrderByAppointmentDateDescCreatedAtDesc(Long customerId);
    List<Appointment> findByAppointmentDateOrderByTimeSlotAsc(LocalDate date);
    List<Appointment> findByAppointmentDateAndStatusOrderByTimeSlotAsc(LocalDate date, String status);
    
    long countByAppointmentDate(LocalDate date);
    long countByAppointmentDateAndStatus(LocalDate date, String status);
    long countByStatus(String status);

    Optional<Appointment> findByCustomerIdAndAppointmentDateAndStatusIn(
            Long customerId, LocalDate appointmentDate, Collection<String> statuses);

    List<Appointment> findByTokenNumber(String tokenNumber);

    List<Appointment> findByAppointmentDateBetween(LocalDate startDate, LocalDate endDate);
    List<Appointment> findByChairId(Long chairId);
    List<Appointment> findByCustomerId(Long customerId);

    boolean existsByChairIdAndAppointmentDateAndTimeSlotAndStatusIn(
            Long chairId, LocalDate appointmentDate, String timeSlot, Collection<String> statuses);

    boolean existsByCustomerIdAndAppointmentDateAndTimeSlotAndStatusIn(
            Long customerId, LocalDate appointmentDate, String timeSlot, Collection<String> statuses);
    
    @Query("SELECT a FROM Appointment a WHERE a.status = :status")
    List<Appointment> findByStatus(@Param("status") String status);
}
