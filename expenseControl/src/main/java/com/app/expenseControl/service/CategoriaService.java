package com.app.expenseControl.service;

import com.app.expenseControl.dto.CategoriaCreateDTO;
import com.app.expenseControl.dto.CategoriaResponseDTO;
import com.app.expenseControl.entity.Categoria;
import com.app.expenseControl.repository.CategoriaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final AuditoriaService auditoriaService;

    public CategoriaService(CategoriaRepository categoriaRepository,
                            AuditoriaService auditoriaService) {
        this.categoriaRepository = categoriaRepository;
        this.auditoriaService = auditoriaService;
    }

    public CategoriaResponseDTO criar(CategoriaCreateDTO dto) {
        String nome = dto.nome().trim();
        if (categoriaRepository.existsByNomeIgnoreCase(nome)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma categoria com esse nome.");
        }

        Categoria cat = Categoria.builder()
                .nome(nome)
                .descricao(dto.descricao())
                .ativa(true)
                .build();

        Categoria salva = categoriaRepository.save(cat);
        auditoriaService.registrar(
                "CATEGORIA_CRIADA",
                "Categoria \"" + salva.getNome() + "\" criada.",
                "CATEGORIA",
                String.valueOf(salva.getId())
        );

        return new CategoriaResponseDTO(salva.getId(), salva.getNome(), salva.getDescricao(), salva.getAtiva());
    }

    public List<CategoriaResponseDTO> listar() {
        return categoriaRepository.findAllByOrderByNomeAsc().stream()
                .map(c -> new CategoriaResponseDTO(c.getId(), c.getNome(), c.getDescricao(), c.getAtiva()))
                .toList();
    }

    public CategoriaResponseDTO inativar(Long id) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria não encontrada."));

        if (Boolean.TRUE.equals(categoria.getAtiva())) {
            categoria.setAtiva(false);
            categoria = categoriaRepository.save(categoria);
            auditoriaService.registrar(
                    "CATEGORIA_INATIVADA",
                    "Categoria \"" + categoria.getNome() + "\" inativada.",
                    "CATEGORIA",
                    String.valueOf(categoria.getId())
            );
        }

        return new CategoriaResponseDTO(
                categoria.getId(),
                categoria.getNome(),
                categoria.getDescricao(),
                categoria.getAtiva()
        );
    }

    public List<CategoriaResponseDTO> listarAtivas() {
        return categoriaRepository.findByAtivaTrueOrderByNomeAsc().stream()
                .map(c -> new CategoriaResponseDTO(c.getId(), c.getNome(), c.getDescricao(), c.getAtiva()))
                .toList();
    }
}
