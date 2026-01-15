package com.app.expenseControl.controller;

import com.app.expenseControl.dto.AuthMeResponseDTO;
import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.repository.ContaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final ContaRepository contaRepository;

    public AuthController(ContaRepository contaRepository) {
        this.contaRepository = contaRepository;
    }

    @GetMapping("/me")
    public AuthMeResponseDTO me() {
        Conta conta = getContaLogada();
        return new AuthMeResponseDTO(
                conta.getUsuario(),
                conta.getNome(),
                conta.getTipo(),
                conta.getFilial()
        );
    }

    private Conta getContaLogada() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario nao autenticado.");
        }

        String usuario = auth.getName();
        return contaRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Conta autenticada nao encontrada no banco."
                ));
    }
}

