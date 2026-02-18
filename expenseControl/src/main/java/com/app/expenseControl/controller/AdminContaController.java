package com.app.expenseControl.controller;

import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.repository.ContaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/admin/contas")
public class AdminContaController {

    private final ContaRepository contaRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminContaController(ContaRepository contaRepository, PasswordEncoder passwordEncoder) {
        this.contaRepository = contaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<ContaResumoResponse> listarContas() {
        return contaRepository.findAll(Sort.by(Sort.Order.asc("tipo"), Sort.Order.asc("usuario")))
                .stream()
                .map(conta -> new ContaResumoResponse(
                        conta.getUsuario(),
                        conta.getNome(),
                        conta.getTipo().name(),
                        conta.getFilial(),
                        conta.isAtivo()
                ))
                .toList();
    }

    @PutMapping("/{usuario}/senha")
    public AlterarSenhaResponse alterarSenha(@PathVariable String usuario,
                                             @RequestBody AlterarSenhaRequest body,
                                             Authentication authentication) {
        String senha = body == null || body.novaSenha() == null ? "" : body.novaSenha().trim();
        if (senha.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "novaSenha obrigatoria.");
        }
        if (senha.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "novaSenha deve ter no minimo 6 caracteres.");
        }

        Conta conta = contaRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado."));

        String usuarioLogado = authentication == null ? "" : authentication.getName();
        boolean alterandoPropriaSenha = conta.getUsuario().equals(usuarioLogado);

        if (alterandoPropriaSenha) {
            String senhaAtual = body == null || body.senhaAtual() == null ? "" : body.senhaAtual().trim();
            if (senhaAtual.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "senhaAtual obrigatoria ao alterar a propria senha.");
            }
            if (!passwordEncoder.matches(senhaAtual, conta.getSenhaHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "senhaAtual invalida.");
            }
        }

        conta.setSenhaHash(passwordEncoder.encode(senha));
        contaRepository.save(conta);

        return new AlterarSenhaResponse(conta.getUsuario(), "Senha alterada com sucesso.");
    }

    public record AlterarSenhaRequest(String novaSenha, String senhaAtual) {}

    public record ContaResumoResponse(
            String usuario,
            String nome,
            String tipo,
            String filial,
            boolean ativo
    ) {}

    public record AlterarSenhaResponse(String usuario, String mensagem) {}
}
