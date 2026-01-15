package com.app.expenseControl.config;

import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.enums.TipoConta;
import com.app.expenseControl.repository.ContaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeed implements CommandLineRunner {

    private final ContaRepository contaRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminSeed(ContaRepository contaRepository, PasswordEncoder passwordEncoder) {
        this.contaRepository = contaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String usuario = "admin";
        String senha = "admin123";

        Conta admin = contaRepository.findByUsuario(usuario).orElseGet(Conta::new);

        admin.setNome("Administrador");
        admin.setUsuario(usuario);
        admin.setTipo(TipoConta.ADMIN);
        admin.setAtivo(true);

        admin.setSenhaHash(passwordEncoder.encode(senha));

        contaRepository.save(admin);

        System.out.println("Admin garantido: " + usuario + " / " + senha);
    }
}
