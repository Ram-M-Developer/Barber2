package com.barberease.repositories;

import com.barberease.models.Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TokenRepository extends JpaRepository<Token, Long> {
    List<Token> findByTokenNumber(String tokenNumber);
    Optional<Token> findFirstByTokenNumberOrderByIdDesc(String tokenNumber);
    List<Token> findByAppointmentId(Long appointmentId);
    List<Token> findByQueueId(Long queueId);
    Optional<Token> findFirstByTokenDateOrderByIdDesc(LocalDate tokenDate);
}
