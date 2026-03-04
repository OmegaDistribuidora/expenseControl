package com.app.expenseControl.service;

import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.enums.TipoConta;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ContaPermissionService {

    private static final String ROOT_ADMIN_USER = "admin";

    public boolean isRootAdmin(Conta conta) {
        return conta != null
                && conta.getTipo() == TipoConta.ADMIN
                && ROOT_ADMIN_USER.equalsIgnoreCase(safe(conta.getUsuario()));
    }

    public boolean canManageUsers(Conta conta) {
        return isRootAdmin(conta);
    }

    public boolean canApproveSolicitacao(Conta conta) {
        if (isRootAdmin(conta)) {
            return true;
        }
        return conta != null
                && conta.getTipo() == TipoConta.ADMIN
                && Boolean.TRUE.equals(conta.getPodeAprovarSolicitacao());
    }

    public boolean canViewFilial(Conta conta, String filial) {
        if (filial == null || filial.isBlank()) {
            return false;
        }
        if (isRootAdmin(conta)) {
            return true;
        }
        if (conta == null) {
            return false;
        }
        if (conta.getTipo() == TipoConta.FILIAL) {
            return normalizedKey(conta.getFilial()).equals(normalizedKey(filial));
        }
        if (conta.getTipo() != TipoConta.ADMIN) {
            return false;
        }
        Set<String> allowed = visibleFilialKeys(conta);
        return allowed.contains(normalizedKey(filial));
    }

    public Set<String> visibleFilialKeys(Conta conta) {
        if (conta == null) {
            return Set.of();
        }
        if (isRootAdmin(conta)) {
            return Set.of();
        }
        if (conta.getTipo() == TipoConta.FILIAL) {
            String filial = normalizedKey(conta.getFilial());
            return filial.isBlank() ? Set.of() : Set.of(filial);
        }
        if (conta.getTipo() != TipoConta.ADMIN) {
            return Set.of();
        }

        String raw = safe(conta.getFiliaisVisiveis());
        if (raw.isBlank()) {
            return Set.of();
        }

        LinkedHashSet<String> keys = new LinkedHashSet<>();
        for (String part : raw.split(",")) {
            String key = normalizedKey(part);
            if (!key.isBlank()) {
                keys.add(key);
            }
        }
        return keys;
    }

    public List<String> visibleFiliaisList(Conta conta) {
        String raw = safe(conta == null ? null : conta.getFiliaisVisiveis());
        if (raw.isBlank()) {
            return List.of();
        }
        return List.of(raw.split(","))
                .stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    public String normalizeFiliaisForStorage(List<String> filiais) {
        if (filiais == null || filiais.isEmpty()) {
            return "";
        }
        return filiais.stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .collect(Collectors.joining(","));
    }

    public String normalizedKey(String value) {
        return safe(value).trim().toLowerCase(Locale.ROOT);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
