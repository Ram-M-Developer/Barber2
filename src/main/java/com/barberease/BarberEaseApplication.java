package com.barberease;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BarberEaseApplication {
    public static void main(String[] args) {
        SpringApplication.run(BarberEaseApplication.class, args);
    }
}
