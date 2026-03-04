package com.app.expenseControl.controller;

import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.enums.TipoConta;
import com.app.expenseControl.repository.ContaRepository;
import com.app.expenseControl.service.ContaPermissionService;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/admin/contas")
public class AdminContaController {

    private final ContaRepository contaRepository;
    private final PasswordEncoder passwordEncoder;
    private final ContaPermissionService permissionService;

    public AdminContaController(ContaRepository contaRepository,
                                PasswordEncoder passwordEncoder,
                                ContaPermissionService permissionService) {
        this.contaRepository = contaRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionService = permissionService;
    }

    @GetMapping
    public List<ContaResumoResponse> listarContas() {
        return contaRepository.findAll(Sort.by(Sort.Order.asc("tipo"), Sort.Order.asc("usuario")))
                .stream()
                .map(this::toResumo)
                .toList();
    }

    @GetMapping("/filiais")
    public List<String> listarFiliaisDisponiveis() {
        LinkedHashMap<String, String> uniques = new LinkedHashMap<>();
        for (Conta filial : contaRepository.findByTipoOrderByFilialAscUsuarioAsc(TipoConta.FILIAL)) {
            String name = filial.getFilial() == null ? "" : filial.getFilial().trim();
            if (!name.isBlank()) {
                uniques.putIfAbsent(permissionService.normalizedKey(name), name);
            }
        }
        return List.copyOf(uniques.values());
    }

    @PostMapping
    public ContaResumoResponse criarConta(@RequestBody CriarContaRequest body, Authentication authentication) {
        Conta contaLogada = getContaLogada(authentication);
        if (!permissionService.canManageUsers(contaLogada)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o usuario admin pode criar contas.");
        }

        String usuario = body == null || body.usuario() == null ? "" : body.usuario().trim().toLowerCase(Locale.ROOT);
        String nome = body == null || body.nome() == null ? "" : body.nome().trim();
        String senha = body == null || body.senha() == null ? "" : body.senha().trim();
        List<String> filiais = body == null ? List.of() : sanitizeFiliais(body.filiaisVisiveis());
        boolean podeAprovar = body != null && Boolean.TRUE.equals(body.podeAprovarSolicitacao());

        if (usuario.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "usuario obrigatorio.");
        }
        if (nome.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nome obrigatorio.");
        }
        if (senha.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "senha deve ter no minimo 6 caracteres.");
        }
        if (contaRepository.existsByUsuario(usuario)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Usuario ja existe.");
        }
        if (filiais.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe ao menos uma filial visivel.");
        }

        Conta conta = Conta.builder()
                .usuario(usuario)
                .nome(nome)
                .senhaHash(passwordEncoder.encode(senha))
                .tipo(TipoConta.ADMIN)
                .ativo(true)
                .podeAprovarSolicitacao(podeAprovar)
                .filiaisVisiveis(permissionService.normalizeFiliaisForStorage(filiais))
                .build();

        Conta salva = contaRepository.save(conta);
        return toResumo(salva);
    }

    @PutMapping("/{usuario}/senha")
    public AlterarSenhaResponse alterarSenha(@PathVariable String usuario,
                                             @RequestBody AlterarSenhaRequest body,
                                             Authentication authentication) {
        Conta contaLogada = getContaLogada(authentication);

        String senha = body == null || body.novaSenha() == null ? "" : body.novaSenha().trim();
        if (senha.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "novaSenha obrigatoria.");
        }
        if (senha.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "novaSenha deve ter no minimo 6 caracteres.");
        }

        Conta contaAlvo = contaRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado."));

        boolean alterandoPropriaSenha = contaAlvo.getUsuario().equals(contaLogada.getUsuario());

        if (!alterandoPropriaSenha && !permissionService.canManageUsers(contaLogada)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissao para alterar senha de outros usuarios.");
        }

        if (alterandoPropriaSenha) {
            String senhaAtual = body == null || body.senhaAtual() == null ? "" : body.senhaAtual().trim();
            if (senhaAtual.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "senhaAtual obrigatoria ao alterar a propria senha.");
            }
            if (!passwordEncoder.matches(senhaAtual, contaAlvo.getSenhaHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "senhaAtual invalida.");
            }
        }

        contaAlvo.setSenhaHash(passwordEncoder.encode(senha));
        contaRepository.save(contaAlvo);

        return new AlterarSenhaResponse(contaAlvo.getUsuario(), "Senha alterada com sucesso.");
    }

    private Conta getContaLogada(Authentication authentication) {
        String usuarioLogado = authentication == null ? "" : authentication.getName();
        if (usuarioLogado == null || usuarioLogado.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario nao autenticado.");
        }

        return contaRepository.findByUsuario(usuarioLogado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Conta autenticada nao encontrada."));
    }

    private List<String> sanitizeFiliais(List<String> rawFiliais) {
        List<String> allowedFiliais = listarFiliaisDisponiveis();
        if (rawFiliais == null || rawFiliais.isEmpty()) {
            return List.of();
        }

        LinkedHashMap<String, String> selected = new LinkedHashMap<>();
        for (String raw : rawFiliais) {
            String key = permissionService.normalizedKey(raw);
            if (key.isBlank()) {
                continue;
            }
            allowedFiliais.stream()
                    .filter(item -> permissionService.normalizedKey(item).equals(key))
                    .findFirst()
                    .ifPresent(match -> selected.putIfAbsent(key, match));
        }

        return List.copyOf(selected.values());
    }

    private ContaResumoResponse toResumo(Conta conta) {
        return new ContaResumoResponse(
                conta.getUsuario(),
                conta.getNome(),
                conta.getTipo().name(),
                conta.getFilial(),
                conta.isAtivo(),
                permissionService.canApproveSolicitacao(conta),
                permissionService.visibleFiliaisList(conta),
                permissionService.isRootAdmin(conta)
        );
    }

    public record CriarContaRequest(
            String usuario,
            String nome,
            String senha,
            Boolean podeAprovarSolicitacao,
            List<String> filiaisVisiveis
    ) {}

    public record AlterarSenhaRequest(String novaSenha, String senhaAtual) {}

    public record ContaResumoResponse(
            String usuario,
            String nome,
            String tipo,
            String filial,
            boolean ativo,
            boolean podeAprovarSolicitacao,
            List<String> filiaisVisiveis,
            boolean superAdmin
    ) {}

    public record AlterarSenhaResponse(String usuario, String mensagem) {}
}
