package com.app.expenseControl.config;

import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.enums.TipoConta;
import com.app.expenseControl.repository.ContaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedUsers(ContaRepository contaRepository, PasswordEncoder encoder) {
        return args -> {
            ensureUser(contaRepository, encoder,
                    "admin", "Administrador", "admin123",
                    TipoConta.ADMIN, null);

            ensureUser(contaRepository, encoder,
                    "omega.matriz", "Omega Matriz", "filial123",
                    TipoConta.FILIAL, "Omega Matriz");

            ensureUser(contaRepository, encoder,
                    "omega.barroso", "Omega Barroso", "filial123",
                    TipoConta.FILIAL, "Omega Barroso");

            ensureUser(contaRepository, encoder,
                    "omega.cariri", "Omega Cariri", "filial123",
                    TipoConta.FILIAL, "Omega Cariri");

            ensureUser(contaRepository, encoder,
                    "omega.sobral", "Omega Sobral", "filial123",
                    TipoConta.FILIAL, "Omega Sobral");
        };
    }

    private void ensureUser(ContaRepository repo,
                            PasswordEncoder encoder,
                            String usuario,
                            String nome,
                            String senhaPlana,
                            TipoConta tipo,
                            String filial) {

        if (repo.existsByUsuario(usuario)) return;

        Conta c = Conta.builder()
                .usuario(usuario)
                .nome(nome)
                .senhaHash(encoder.encode(senhaPlana))
                .tipo(tipo)
                .filial(filial)
                .ativo(true)
                .build();

        repo.save(c);
    }
}
