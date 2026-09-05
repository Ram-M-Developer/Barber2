package com.barberease.repositories;

import com.barberease.models.Queue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface QueueRepository extends JpaRepository<Queue, Long> {
    List<Queue> findByStatusInOrderByPositionAsc(Collection<String> statuses);
    Optional<Queue> findByCustomerIdAndStatusIn(Long customerId, Collection<String> statuses);
    Optional<Queue> findFirstByStatusOrderByPositionAsc(String status);
    Optional<Queue> findFirstByStatusInOrderByPositionDesc(Collection<String> statuses);
    List<Queue> findByStatusOrderByCreatedAtAsc(String status);
    
    long countByStatus(String status);
    long countByStatusAndCompletedAtAfter(String status, LocalDateTime cutoff);
}
