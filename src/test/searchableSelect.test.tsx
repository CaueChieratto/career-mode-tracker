// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import SearchableSelect from "../components/SearchableSelect";

describe("SearchableSelect - filtragem ao digitar", () => {
  beforeEach(() => {
    cleanup();
  });

  const options = [
    "Artilheiro do Campeonato",
    "Campeão Nacional",
    "Gols na Temporada",
    "Melhor do Mundo (Bola de Ouro)",
    "Vencer a Copa",
  ];

  it("exibe todas as opções quando aberto com valor vazio", () => {
    render(
      <SearchableSelect
        name="objective"
        options={options}
        value=""
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);

    options.forEach((opt) => {
      expect(screen.getByText(opt)).not.toBeNull();
    });
  });

  it("filtra as opções ao digitar ignorando maiúsculas e acentos", () => {
    const { rerender } = render(
      <SearchableSelect
        name="objective"
        options={options}
        value=""
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);

    // Digita 'campeao' sem acento
    rerender(
      <SearchableSelect
        name="objective"
        options={options}
        value="campeao"
        onChange={vi.fn()}
      />,
    );

    // Deve encontrar 'Campeão Nacional' (normalizado de campeão) e não os outros
    expect(screen.getByText("Campeão Nacional")).not.toBeNull();
    expect(screen.queryByText("Artilheiro do Campeonato")).toBeNull();
    expect(screen.queryByText("Vencer a Copa")).toBeNull();
  });

  it("exibe feedback 'Nenhuma opção encontrada' quando não há correspondência", () => {
    render(
      <SearchableSelect
        name="objective"
        options={options}
        value="xyzinvalido"
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);

    expect(screen.getByText("Nenhuma opção encontrada")).not.toBeNull();
  });

  it("chama onChange com a opção selecionada ao clicar", () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        name="objective"
        options={options}
        value="Gol"
        onChange={handleChange}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);

    const optionItem = screen.getByText("Gols na Temporada");
    fireEvent.mouseDown(optionItem);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: "objective",
          value: "Gols na Temporada",
        }),
      }),
    );
  });
});
