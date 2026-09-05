package com.barberease.repositories;

import com.barberease.models.Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface TokenRepository extends JpaRepository<Token, Long> {
    Optional<Token> findByTokenNumber(String tokenNumber);
    Optional<Token> findFirstByTokenDateOrderByIdDesc(LocalDate tokenDate);
}
