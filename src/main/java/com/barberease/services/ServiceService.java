package com.barberease.services;

import com.barberease.repositories.ServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ServiceService {

    @Autowired
    private ServiceRepository serviceRepository;

    public List<com.barberease.models.Service> getAllServices() {
        return serviceRepository.findByIsActiveTrueOrderByCategoryAscNameAsc();
    }

    public List<com.barberease.models.Service> getAllServicesAdmin() {
        return serviceRepository.findAllByOrderByCategoryAscNameAsc();
    }

    public com.barberease.models.Service getServiceById(Long id) {
        return serviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));
    }

    public com.barberease.models.Service createService(com.barberease.models.Service service) {
        service.setActive(true);
        return serviceRepository.save(service);
    }

    public com.barberease.models.Service updateService(Long id, com.barberease.models.Service data) {
        com.barberease.models.Service service = getServiceById(id);

        if (data.getName() != null) service.setName(data.getName());
        if (data.getDescription() != null) service.setDescription(data.getDescription());
        service.setDurationMinutes(data.getDurationMinutes());
        if (data.getPrice() != null) service.setPrice(data.getPrice());
        if (data.getCategory() != null) service.setCategory(data.getCategory());
        service.setActive(data.isActive());

        return serviceRepository.save(service);
    }

    public void deleteService(Long id) {
        com.barberease.models.Service service = getServiceById(id);
        service.setActive(false);
        serviceRepository.save(service);
    }
}
