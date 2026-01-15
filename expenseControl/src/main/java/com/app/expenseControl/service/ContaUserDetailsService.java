package com.app.expenseControl.service;

import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.repository.ContaRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContaUserDetailsService implements UserDetailsService {

    private final ContaRepository contaRepository;

    public ContaUserDetailsService(ContaRepository contaRepository) {
        this.contaRepository = contaRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String usuario) throws UsernameNotFoundException {
        Conta conta = contaRepository.findByUsuario(usuario)
                .orElseThrow(() -> new UsernameNotFoundException("Conta nao encontrada."));

        String role = "ROLE_" + conta.getTipo().name(); // ROLE_ADMIN / ROLE_FILIAL

        return User.builder()
                .username(conta.getUsuario())
                .password(conta.getSenhaHash())
                .disabled(!conta.isAtivo())
                .authorities(List.of(new SimpleGrantedAuthority(role)))
                .build();
    }
}


