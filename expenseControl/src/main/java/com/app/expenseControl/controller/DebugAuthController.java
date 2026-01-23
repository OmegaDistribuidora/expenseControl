package com.app.expenseControl.controller;

import com.app.expenseControl.repository.ContaRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@Profile("dev")
@RestController
public class DebugAuthController {

    private final ContaRepository contaRepository;
    private final PasswordEncoder passwordEncoder;

    public DebugAuthController(ContaRepository contaRepository, PasswordEncoder passwordEncoder) {
        this.contaRepository = contaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/debug/auth-header")
    public String authHeader(@RequestHeader(value = "Authorization", required = false) String auth) {
        return (auth == null) ? "SEM AUTH HEADER" : auth.substring(0, Math.min(40, auth.length()));
    }

    @GetMapping("/debug/admin-matches")
    public String matches() {
        var contaOpt = contaRepository.findByUsuario("admin");
        if (contaOpt.isEmpty()) return "Admin não existe no banco.";

        var admin = contaOpt.get();
        boolean ok = passwordEncoder.matches("admin123", admin.getSenhaHash());

        return "matches(admin123) = " + ok + " | hashPrefix=" + admin.getSenhaHash().substring(0, 4);
    }
}

