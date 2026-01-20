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

    public CategoriaService(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }

    public CategoriaResponseDTO criar(CategoriaCreateDTO dto) {
        String nome = dto.nome().trim();
        if (categoriaRepository.existsByNomeIgnoreCase(nome)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe uma categoria com esse nome.");
        }

        Categoria cat = Categoria.builder()
                .nome(nome)
                .descricao(dto.descricao())
                .ativa(true)
                .build();

        Categoria salva = categoriaRepository.save(cat);

        return new CategoriaResponseDTO(salva.getId(), salva.getNome(), salva.getDescricao(), salva.getAtiva());
    }

    public List<CategoriaResponseDTO> listar() {
        return categoriaRepository.findAllByOrderByNomeAsc().stream()
                .map(c -> new CategoriaResponseDTO(c.getId(), c.getNome(), c.getDescricao(), c.getAtiva()))
                .toList();
    }

    public CategoriaResponseDTO inativar(Long id) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria nao encontrada."));

        if (Boolean.TRUE.equals(categoria.getAtiva())) {
            categoria.setAtiva(false);
            categoria = categoriaRepository.save(categoria);
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
