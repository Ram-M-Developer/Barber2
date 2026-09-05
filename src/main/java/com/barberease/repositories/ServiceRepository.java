package com.barberease.repositories;

import com.barberease.models.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {
    List<Service> findByIsActiveTrueOrderByCategoryAscNameAsc();
    List<Service> findAllByOrderByCategoryAscNameAsc();
}
