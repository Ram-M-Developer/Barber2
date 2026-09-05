package com.barberease.config;

import com.barberease.models.Admin;
import com.barberease.models.Chair;
import com.barberease.models.Service;
import com.barberease.repositories.AdminRepository;
import com.barberease.repositories.ChairRepository;
import com.barberease.repositories.ServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ChairRepository chairRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        seedAdmin();
        seedServices();
        seedChairs();
    }

    private void seedAdmin() {
        if (adminRepository.findByUsername("admin").isEmpty()) {
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setEmail("admin@barberease.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFullName("System Administrator");
            admin.setRole("super_admin");
            admin.setActive(true);
            adminRepository.save(admin);
            System.out.println("👤 Default admin account seeded (username: admin, password: admin123)");
        }
    }

    private void seedServices() {
        if (serviceRepository.count() == 0) {
            List<Service> services = new ArrayList<>();

            services.add(createService("Signature Haircut & Styling",
                    "Bespoke haircut tailored to your head shape, including hair wash, hot towel rinse, and premium pomade styling.",
                    45, new BigDecimal("45.00"), "haircut"));

            services.add(createService("Executive Skin Fade",
                    "Ultra-clean taper or zero skin fade crafted with precision foil shaver and straight razor edge-up.",
                    50, new BigDecimal("50.00"), "haircut"));

            services.add(createService("Royal Hot Towel Shave",
                    "Traditional straight razor shave with multi-layered hot towel treatment, pre-shave oil, and soothing balm.",
                    35, new BigDecimal("35.00"), "shave"));

            services.add(createService("Beard Sculpt & Line-Up",
                    "Detailed beard trimming, length shaping, cheek razor line-up, and organic beard oil hydration.",
                    30, new BigDecimal("30.00"), "beard"));

            services.add(createService("VIP Master Grooming Package",
                    "The ultimate royal treatment combining Signature Haircut, Royal Hot Towel Shave, Detox Facial, and scalp therapy.",
                    80, new BigDecimal("85.00"), "vip"));

            services.add(createService("Detox Scalp & Facial Spa",
                    "Deep cleansing charcoal mask, pore steam treatment, scalp exfoliation, and relaxing face massage.",
                    30, new BigDecimal("40.00"), "facial"));

            serviceRepository.saveAll(services);
            System.out.println("✂️ Grooming services seeded successfully (" + services.size() + " services created)");
        }
    }

    private void seedChairs() {
        if (chairRepository.count() == 0) {
            List<Chair> chairs = new ArrayList<>();
            for (int i = 1; i <= 8; i++) {
                Chair chair = new Chair();
                chair.setChairNumber(i);
                chair.setName("Chair " + i);
                chair.setStatus("available");
                chair.setActive(true);
                chairs.add(chair);
            }
            chairRepository.saveAll(chairs);
            System.out.println("💺 Barber chairs seeded successfully (8 chairs created)");
        }
    }

    private Service createService(String name, String desc, int duration, BigDecimal price, String cat) {
        Service s = new Service();
        s.setName(name);
        s.setDescription(desc);
        s.setDurationMinutes(duration);
        s.setPrice(price);
        s.setCategory(cat);
        s.setActive(true);
        return s;
    }
}
