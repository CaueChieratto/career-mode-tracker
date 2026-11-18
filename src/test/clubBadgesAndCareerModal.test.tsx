// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FootballDataService } from "../common/services/FootballDataService";
import {
  ServiceClubBadges,
  normalizeClubKey,
} from "../common/services/ServiceClubBadges";
import { UseCreateCareer } from "../common/hooks/Career/UseCreateCareer";
import { ColorsService } from "../common/services/ColorsService";
import { ServiceCareer } from "../common/services/ServiceCareer";
import { CloudinaryService } from "../common/services/CloudinaryService";
import { EditCareerModal } from "../ui/modals/EditCareerModal";
import EditInfoClub from "../ui/modals/EditCareerModal/components/EditInfoClub";
import { buildTeamData } from "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/helpers/buildTeamData";
import { getDocs, querySnapshot } from "./mocks/firestore";
import { career, season } from "./factories/domain";
import { Career } from "../common/interfaces/Career";
import { clearAllToasts, toastStore } from "../common/services/ToastService";

describe("Unificação da API de Badges, Cores Manuais e Modal de Carreira", () => {
  beforeEach(() => {
    clearAllToasts();
    vi.stubGlobal("alert", vi.fn());
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake");
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
    getDocs.mockReset().mockResolvedValue(querySnapshot([]));
  });

  afterEach(() => {
    clearAllToasts();
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. FootballDataService
  // ==========================================
  describe("FootballDataService", () => {
    it("retorna null imediatamente sem chamar fetch se o token de API estiver ausente", async () => {
      vi.stubEnv("VITE_FOOTBALL_DATA_API_TOKEN", "");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const result = await FootballDataService.fetchTeamByClubName("Arsenal");
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("retorna null se o nome do clube for vazio ou apenas espaços", async () => {
      vi.stubEnv("VITE_FOOTBALL_DATA_API_TOKEN", "fake-token");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const result = await FootballDataService.fetchTeamByClubName("   ");
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("seleciona o melhor clube por score de similaridade com badge mapeado de crest (sem campos de cores)", async () => {
      vi.stubEnv("VITE_FOOTBALL_DATA_API_TOKEN", "test-token");
      const mockTeams = [
        {
          id: 10,
          name: "Real Betis Balompié",
          shortName: "Betis",
          tla: "BET",
          crest: "https://crests.football-data.org/10.png",
          clubColors: "Green / White",
        },
        {
          id: 81,
          name: "FC Barcelona",
          shortName: "Barça",
          tla: "FCB",
          crest: "https://crests.football-data.org/81.png",
          clubColors: "Blue / Red",
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ count: 2, teams: mockTeams }),
        }),
      );

      const result = await FootballDataService.fetchTeamByClubName("FC Barcelona");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("81");
      expect(result?.name).toBe("FC Barcelona");
      expect(result?.badge).toBe("https://crests.football-data.org/81.png");
      expect((result as unknown as Record<string, unknown>).strColour1).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).clubColors).toBeUndefined();
    });

    it("desempata pelo menor comprimento do nome em pontuações iguais", async () => {
      vi.stubEnv("VITE_FOOTBALL_DATA_API_TOKEN", "test-token");
      const mockTeams = [
        {
          id: 1,
          name: "FC Barcelona Atlètic",
          shortName: "Barça B",
          tla: "FCB",
          crest: "https://crests.football-data.org/1.png",
        },
        {
          id: 2,
          name: "FC Barcelona",
          shortName: "Barça",
          tla: "FCB",
          crest: "https://crests.football-data.org/2.png",
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ count: 2, teams: mockTeams }),
        }),
      );

      const result = await FootballDataService.fetchTeamByClubName("Barcelona");
      expect(result?.id).toBe("2");
      expect(result?.name).toBe("FC Barcelona");
    });

    it("trata HTTP 429 e erros de resposta retornando null de forma resiliente", async () => {
      vi.stubEnv("VITE_FOOTBALL_DATA_API_TOKEN", "test-token");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
        }),
      );

      const result = await FootballDataService.fetchTeamByClubName("Chelsea");
      expect(result).toBeNull();
    });
  });

  // ==========================================
  // 2. ServiceClubBadges (Firebase-First, Catalog & Available Clubs)
  // ==========================================
  describe("ServiceClubBadges", () => {
    it("normalizeClubKey remove acentos, espaços extras e transforma em minúsculas", () => {
      expect(normalizeClubKey("  São Paulo F.C.  ")).toBe("sao paulo f.c.");
      expect(normalizeClubKey("Atlético de Madrid")).toBe("atletico de madrid");
      expect(normalizeClubKey("Bayern München")).toBe("bayern munchen");
    });

    it("Hit no Firebase do próprio usuário (season.teams): retorna o badge e NUNCA chama a API externa", async () => {
      const existingCareer: Career = career({
        id: "c1",
        clubName: "Meu Time",
        clubData: [
          season({
            teams: [
              {
                name: "FC Barcelona",
                badge: "https://res.cloudinary.com/demo/image/upload/barca.png",
              },
            ],
          }),
        ],
      });

      getDocs.mockResolvedValue(
        querySnapshot([{ id: "c1", data: existingCareer }]),
      );

      const fetchTeamSpy = vi.spyOn(FootballDataService, "fetchTeamByClubName");

      const badge = await ServiceClubBadges.resolveClubBadge("FC Barcelona");

      expect(badge).toBe(
        "https://res.cloudinary.com/demo/image/upload/barca.png",
      );
      expect(fetchTeamSpy).not.toHaveBeenCalled();
    });

    it("Hit no Firebase do próprio usuário (career.clubName + career.teamBadge): retorna o badge sem chamar a API", async () => {
      const existingCareer: Career = career({
        id: "c2",
        clubName: "Arsenal",
        teamBadge: "https://crests.football-data.org/57.png",
        clubData: [],
      });

      getDocs.mockResolvedValue(
        querySnapshot([{ id: "c2", data: existingCareer }]),
      );

      const fetchTeamSpy = vi.spyOn(FootballDataService, "fetchTeamByClubName");

      const badge = await ServiceClubBadges.resolveClubBadge("Arsenal");

      expect(badge).toBe("https://crests.football-data.org/57.png");
      expect(fetchTeamSpy).not.toHaveBeenCalled();
    });

    it("Hit no Firebase do próprio usuário (season.table): retorna o badge sem chamar a API", async () => {
      const existingCareer: Career = career({
        id: "c3",
        clubName: "Meu Clube",
        clubData: [
          season({
            table: [
              {
                id: "1",
                position: 1,
                name: "Liverpool FC",
                badge: "https://crests.football-data.org/64.png",
                played: 4,
                won: 3,
                drawn: 1,
                lost: 0,
                goalsFor: 8,
                goalsAgainst: 2,
                goalDiff: 6,
                points: 10,
                zone: "first",
              },
            ],
          }),
        ],
      });

      getDocs.mockResolvedValue(
        querySnapshot([{ id: "c3", data: existingCareer }]),
      );

      const fetchTeamSpy = vi.spyOn(FootballDataService, "fetchTeamByClubName");

      const badge = await ServiceClubBadges.resolveClubBadge("Liverpool FC");

      expect(badge).toBe("https://crests.football-data.org/64.png");
      expect(fetchTeamSpy).not.toHaveBeenCalled();
    });

    it("Miss no Firebase sendo o usuário especial: consulta a API externa", async () => {
      vi.stubEnv("VITE_SPECIAL_USER_ID", "test-user"); // auth.currentUser.uid é 'test-user'

      getDocs.mockResolvedValue(querySnapshot([]));

      const fetchTeamSpy = vi
        .spyOn(FootballDataService, "fetchTeamByClubName")
        .mockResolvedValue({
          id: "99",
          name: "Inédito FC",
          shortName: "Inédito",
          badge: "https://crests.football-data.org/99.png",
        });

      const badge = await ServiceClubBadges.resolveClubBadge("Inédito FC");

      expect(badge).toBe("https://crests.football-data.org/99.png");
      expect(fetchTeamSpy).toHaveBeenCalledTimes(1);
      expect(fetchTeamSpy).toHaveBeenCalledWith("Inédito FC");
    });

    it("Miss no Firebase NÃO sendo o usuário especial: consulta o catálogo do usuário especial e NUNCA chama a API externa", async () => {
      vi.stubEnv("VITE_SPECIAL_USER_ID", "special-admin-uid");

      const specialCatalogCareer: Career = career({
        id: "spec-c1",
        clubName: "Clube Especial",
        clubData: [
          season({
            teams: [
              {
                name: "Borussia Dortmund",
                badge: "https://crests.football-data.org/4.png",
              },
            ],
          }),
        ],
      });

      getDocs.mockImplementation(async (...args: unknown[]) => {
        const ref = args[0] as { path?: string } | undefined;
        if (ref?.path?.includes("special-admin-uid")) {
          return querySnapshot([
            { id: "spec-c1", data: specialCatalogCareer },
          ]);
        }
        return querySnapshot([]);
      });

      const fetchTeamSpy = vi.spyOn(FootballDataService, "fetchTeamByClubName");

      const badge = await ServiceClubBadges.resolveClubBadge(
        "Borussia Dortmund",
      );

      expect(badge).toBe("https://crests.football-data.org/4.png");
      expect(fetchTeamSpy).not.toHaveBeenCalled();
    });

    it("getAvailableClubsWithBadges: retorna lista ordenada e única de clubes que possuem badge", async () => {
      const userCareer: Career = career({
        id: "c-user",
        clubName: "FC Barcelona",
        teamBadge: "https://crests.football-data.org/81.png",
        clubData: [
          season({
            teams: [
              {
                name: "Real Betis",
                badge: "https://crests.football-data.org/betis.png",
              },
              {
                name: "Sem Escudo FC",
                badge: "",
              },
            ],
            table: [
              {
                id: "t1",
                position: 1,
                name: "Atlético de Madrid",
                badge: "https://crests.football-data.org/atleti.png",
                played: 1,
                won: 1,
                drawn: 0,
                lost: 0,
                goalsFor: 2,
                goalsAgainst: 0,
                goalDiff: 2,
                points: 3,
                zone: "first",
              },
            ],
          }),
        ],
      });

      getDocs.mockResolvedValue(
        querySnapshot([{ id: "c-user", data: userCareer }]),
      );

      const clubs = await ServiceClubBadges.getAvailableClubsWithBadges();

      expect(clubs).toContain("FC Barcelona");
      expect(clubs).toContain("Real Betis");
      expect(clubs).toContain("Atlético de Madrid");
      expect(clubs).not.toContain("Sem Escudo FC");
      expect(clubs).toEqual([...clubs].sort((a, b) => a.localeCompare(b, "pt-BR")));
    });

    it("retorna string vazia quando não encontrado no Firebase nem no catálogo especial", async () => {
      vi.stubEnv("VITE_SPECIAL_USER_ID", "special-admin-uid");
      getDocs.mockResolvedValue(querySnapshot([]));
      const fetchTeamSpy = vi.spyOn(FootballDataService, "fetchTeamByClubName");

      const badge = await ServiceClubBadges.resolveClubBadge("Time Que Nao Existe");

      expect(badge).toBe("");
      expect(fetchTeamSpy).not.toHaveBeenCalled();
    });

    it("resolveClubColors: extrai cores de carreira legada do usuário especial (criada com API antiga) e associa ao clube", async () => {
      vi.stubEnv("VITE_SPECIAL_USER_ID", "special-admin-uid");

      const legacyCareerFromSpecialUser: Career = career({
        id: "legacy-barca-c1",
        clubName: "FC Barcelona",
        teamBadge: "https://crests.football-data.org/81.png",
        colorsTeams: ["#a50044", "#004d98"],
      });

      getDocs.mockImplementation(async (...args: unknown[]) => {
        const ref = args[0] as { path?: string } | undefined;
        if (ref?.path?.includes("special-admin-uid")) {
          return querySnapshot([
            { id: "legacy-barca-c1", data: legacyCareerFromSpecialUser },
          ]);
        }
        return querySnapshot([]);
      });

      const colors = await ServiceClubBadges.resolveClubColors("FC Barcelona");

      expect(colors).toEqual(["#a50044", "#004d98"]);
    });

    it("resolveClubColors: o usuário especial define a cor 'Real' do clube para todos os usuários", async () => {
      vi.stubEnv("VITE_SPECIAL_USER_ID", "special-admin-uid");

      const specialUserCareer: Career = career({
        id: "spec-c1",
        clubName: "Real Betis",
        teamBadge: "https://crests.football-data.org/betis.png",
        colorsTeams: ["#008000", "#ffffff"],
      });

      getDocs.mockImplementation(async (...args: unknown[]) => {
        const ref = args[0] as { path?: string } | undefined;
        if (ref?.path?.includes("special-admin-uid")) {
          return querySnapshot([{ id: "spec-c1", data: specialUserCareer }]);
        }
        return querySnapshot([]);
      });

      const colors = await ServiceClubBadges.resolveClubColors("Real Betis");
      expect(colors).toEqual(["#008000", "#ffffff"]);
    });

    it("resolveClubColors: se outro usuário customizar as cores, elas ficam específicas dele sem alterar a cor 'Real' dos demais", async () => {
      vi.stubEnv("VITE_SPECIAL_USER_ID", "special-admin-uid");

      const specialUserCareer: Career = career({
        id: "spec-c1",
        clubName: "Real Betis",
        colorsTeams: ["#008000", "#ffffff"],
      });

      const regularUserCareer: Career = career({
        id: "user-c1",
        clubName: "Real Betis",
        colorsTeams: ["#800080", "#ffd700"],
      });

      getDocs.mockImplementation(async (...args: unknown[]) => {
        const ref = args[0] as { path?: string } | undefined;
        if (ref?.path?.includes("special-admin-uid")) {
          return querySnapshot([{ id: "spec-c1", data: specialUserCareer }]);
        }
        return querySnapshot([{ id: "user-c1", data: regularUserCareer }]);
      });

      const colorsForRegularUser = await ServiceClubBadges.resolveClubColors("Real Betis");
      expect(colorsForRegularUser).toEqual(["#800080", "#ffd700"]);
    });

    it("resolveClubColors: primeira seleção de cor do clube se torna a cor 'Real' até o usuário especial definir uma nova", async () => {
      vi.stubEnv("VITE_SPECIAL_USER_ID", "special-admin-uid");

      const firstSelectionCareer: Career = career({
        id: "user1-c1",
        clubName: "Girona FC",
        colorsTeams: ["#ff0000", "#ffffff"],
      });

      getDocs.mockImplementation(async (...args: unknown[]) => {
        const ref = args[0] as { path?: string } | undefined;
        if (ref?.path?.includes("special-admin-uid")) {
          return querySnapshot([]);
        }
        return querySnapshot([{ id: "user1-c1", data: firstSelectionCareer }]);
      });

      const initialRealColors = await ServiceClubBadges.resolveClubColors("Girona FC");
      expect(initialRealColors).toEqual(["#ff0000", "#ffffff"]);

      const specialUserNewCareer: Career = career({
        id: "spec-girona",
        clubName: "Girona FC",
        colorsTeams: ["#cc0000", "#000066"],
      });

      getDocs.mockImplementation(async (...args: unknown[]) => {
        const ref = args[0] as { path?: string } | undefined;
        if (ref?.path?.includes("special-admin-uid")) {
          return querySnapshot([{ id: "spec-girona", data: specialUserNewCareer }]);
        }
        return querySnapshot([]);
      });

      const updatedRealColors = await ServiceClubBadges.resolveClubColors("Girona FC");
      expect(updatedRealColors).toEqual(["#cc0000", "#000066"]);
    });
  });

  // ==========================================
  // 3. UseCreateCareer (Cores Manuais e Nome Fiel com Padrão Barcelona)
  // ==========================================
  describe("UseCreateCareer", () => {
    it("cria carreira preservando as 2 cores manuais e o clubName digitado pelo usuário (padrão Barcelona)", async () => {
      vi.spyOn(ServiceClubBadges, "resolveClubBadge").mockResolvedValue(
        "https://crests.football-data.org/81.png",
      );
      const saveColorsSpy = vi.spyOn(ColorsService, "saveColors");

      const newCareer = await UseCreateCareer({
        club: "  FC Barcelona  ",
        manager: "Hansi Flick",
        nation: "Espanha",
        createdAt: "15/08/2024",
        primaryColor: "#004D98",
        secondaryColor: "#A50044",
      });

      expect(newCareer.clubName).toBe("FC Barcelona");
      expect(newCareer.managerName).toBe("Hansi Flick");
      expect(newCareer.nation).toBe("Espanha");
      expect(newCareer.teamBadge).toBe("https://crests.football-data.org/81.png");
      expect(newCareer.colorsTeams).toEqual(["#004D98", "#A50044"]);
      expect(saveColorsSpy).toHaveBeenCalledWith(newCareer.id, "#004D98");
    });
  });

  // ==========================================
  // 4. EditCareerModal nos 3 Modos ("create" | "edit" | "style")
  // ==========================================
  describe("EditCareerModal", () => {
    it('Modo "create": renderiza Clube e País como SearchableSelect sem MdKeyboardArrowRight', () => {
      const { container } = render(
        <EditCareerModal
          mode="create"
          closeModal={vi.fn()}
        />,
      );

      expect(screen.getByText("INFORMAÇÕES DO CLUBE")).toBeDefined();
      expect(screen.getByText("Clube")).toBeDefined();
      expect(screen.getByText("País")).toBeDefined();
      expect(screen.getByText("Técnico")).toBeDefined();
      expect(screen.getByText("Data")).toBeDefined();
      expect(screen.getByText("CORES DO CLUBE")).toBeDefined();
      expect(screen.getByText("Cor primária")).toBeDefined();
      expect(screen.getByText("Cor secundária")).toBeDefined();

      // NÃO deve exibir o banner de upload manual
      expect(screen.queryByText("Toque para adicionar o escudo")).toBeNull();

      // Linhas com SearchableSelect (Clube e País) NÃO devem ter MdKeyboardArrowRight
      const rows = container.querySelectorAll("._row_d6444c, [class*='row']");
      expect(rows.length).toBeGreaterThanOrEqual(4);

      // Linha do Clube (row 0): tem SearchableSelect e NÃO tem chevron da linha
      const clubRow = rows[0];
      expect(clubRow.querySelector("input[name='club']")).not.toBeNull();
      // Não tem a seta externa MdKeyboardArrowRight (mas SearchableSelect tem FaChevronDown interno)
      expect(clubRow.querySelector("._chevron_d6444c")).toBeNull();

      // Linha do País (row 1): tem SearchableSelect e NÃO tem chevron da linha
      const nationRow = rows[1];
      expect(nationRow.querySelector("input[name='nation']")).not.toBeNull();
      expect(nationRow.querySelector("._chevron_d6444c")).toBeNull();
    });

    it('Modo "create": usa "Ex: FC Barcelona" e "Ex: Hansi Flick" como placeholders padrão', () => {
      const prevCareer = career({
        id: "prev-id",
        clubName: "Time Anterior",
        managerName: "Técnico Anterior",
        nation: "Brasil",
        colorsTeams: ["#111111", "#222222"],
      });

      render(
        <EditCareerModal
          mode="create"
          closeModal={vi.fn()}
          selectedCareer={prevCareer}
        />,
      );

      const clubInput = screen.getByPlaceholderText("Ex: FC Barcelona") as HTMLInputElement;
      expect(clubInput.value).toBe("");

      const managerInput = screen.getByPlaceholderText("Ex: Hansi Flick") as HTMLInputElement;
      expect(managerInput.value).toBe("");

      const countrySelect = screen.getByPlaceholderText("Selecione o país") as HTMLInputElement;
      expect(countrySelect.value).toBe("");
    });

    it('Modo "create": valida campos obrigatórios e país da lista no submit', async () => {
      const closeModal = vi.fn();
      render(
        <EditCareerModal
          mode="create"
          closeModal={closeModal}
        />,
      );

      const submitBtn = screen.getByRole("button", { name: "Salvar" });

      // Submissão com campos vazios
      await act(async () => {
        fireEvent.click(submitBtn);
      });
      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message ===
                "Preencha todos os campos obrigatórios (Clube, País e Técnico)!",
          ),
      ).toBe(true);
      expect(closeModal).not.toHaveBeenCalled();

      // Preenche Clube e Técnico, mas deixa país inválido
      const clubInput = screen.getByPlaceholderText("Ex: FC Barcelona");
      const managerInput = screen.getByPlaceholderText("Ex: Hansi Flick");
      const countryInput = screen.getByPlaceholderText("Selecione o país");

      fireEvent.change(clubInput, { target: { value: "Milan" } });
      fireEvent.change(managerInput, { target: { value: "Fonseca" } });
      fireEvent.change(countryInput, { target: { value: "PaisInvalido" } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });
      expect(
        toastStore
          .getSnapshot()
          .some(
            (t) =>
              t.type === "warning" &&
              t.message === "Selecione um país válido da lista!",
          ),
      ).toBe(true);
      expect(closeModal).not.toHaveBeenCalled();
    });

    it('Modo "create": com campos válidos, cria carreira com as 2 cores selecionadas e fecha modal', async () => {
      const closeModal = vi.fn();
      const saveCareerSpy = vi
        .spyOn(ServiceCareer, "saveCareer")
        .mockResolvedValue(undefined);
      vi.spyOn(ServiceClubBadges, "resolveClubBadge").mockResolvedValue(
        "https://crests.football-data.org/81.png",
      );

      const { container } = render(
        <EditCareerModal
          mode="create"
          closeModal={closeModal}
        />,
      );

      const clubInput = screen.getByPlaceholderText("Ex: FC Barcelona");
      const managerInput = screen.getByPlaceholderText("Ex: Hansi Flick");
      const countryInput = screen.getByPlaceholderText("Selecione o país");
      const primaryColorInput = container.querySelector("#primaryColor") as HTMLInputElement;
      const secondaryColorInput = container.querySelector("#secondaryColor") as HTMLInputElement;

      fireEvent.change(clubInput, { target: { value: "FC Barcelona" } });
      fireEvent.change(managerInput, { target: { value: "Hansi Flick" } });
      fireEvent.change(countryInput, { target: { value: "Espanha" } });
      fireEvent.change(primaryColorInput, { target: { value: "#004D98" } });
      fireEvent.change(secondaryColorInput, { target: { value: "#A50044" } });

      // Clica na opção da lista de países
      const option = screen.getByText("Espanha");
      fireEvent.click(option);

      const submitBtn = screen.getByRole("button", { name: "Salvar" });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(saveCareerSpy).toHaveBeenCalledTimes(1);
      const savedCareer = saveCareerSpy.mock.calls[0][0];
      expect(savedCareer.clubName).toBe("FC Barcelona");
      expect(savedCareer.managerName).toBe("Hansi Flick");
      expect(savedCareer.nation).toBe("Espanha");
      expect(savedCareer.teamBadge).toBe(
        "https://crests.football-data.org/81.png",
      );
      expect(savedCareer.colorsTeams).toEqual(["#004d98", "#a50044"]);
      expect(closeModal).toHaveBeenCalledTimes(1);
    });

    it('EditInfoClub: exibe opções existentes de clubes com badges disponíveis no SearchableSelect', () => {
      const setClubName = vi.fn();
      render(
        <EditInfoClub
          mode="create"
          clubName=""
          setClubName={setClubName}
          clubOptions={["Arsenal", "Chelsea FC", "FC Barcelona"]}
          managerName=""
          setManagerName={vi.fn()}
          createdAt=""
          setCreatedAt={vi.fn()}
        />,
      );

      const clubInput = screen.getByPlaceholderText("Ex: FC Barcelona");
      fireEvent.focus(clubInput);

      expect(screen.getByText("FC Barcelona")).toBeDefined();
      expect(screen.getByText("Arsenal")).toBeDefined();
      expect(screen.getByText("Chelsea FC")).toBeDefined();

      fireEvent.mouseDown(screen.getByText("FC Barcelona"));
      expect(setClubName).toHaveBeenCalledWith("FC Barcelona");
    });

    it('Modo "edit": renderiza AddClubImg, Clube, Técnico e Cores (sem campo de País)', () => {
      const testCareer = career({
        id: "edit-1",
        clubName: "Chelsea FC",
        managerName: "Enzo Maresca",
        nation: "Inglaterra",
        colorsTeams: ["#034694", "#FFFFFF"],
      });

      render(
        <EditCareerModal
          mode="edit"
          selectedCareer={testCareer}
          setSelectedCareer={vi.fn()}
          closeModal={vi.fn()}
        />,
      );

      expect(screen.getByText("Toque para adicionar o escudo")).toBeDefined();
      expect(screen.getByText("Clube")).toBeDefined();
      expect(screen.getByText("Técnico")).toBeDefined();
      expect(screen.getByText("Data")).toBeDefined();
      expect(screen.queryByText("País")).toBeNull();
      expect(screen.getByText("CORES DO CLUBE")).toBeDefined();
    });

    it('Modo "edit": faz upload para CloudinaryService se houver imagem anexada', async () => {
      const testCareer = career({
        id: "edit-2",
        clubName: "FC Barcelona",
        managerName: "Hansi Flick",
        colorsTeams: ["#004D98", "#A50044"],
      });
      const setSelectedCareer = vi.fn();
      const closeModal = vi.fn();

      const uploadSpy = vi
        .spyOn(CloudinaryService, "uploadImage")
        .mockResolvedValue("https://res.cloudinary.com/demo/image/upload/barca.png");
      const editCareerSpy = vi
        .spyOn(ServiceCareer, "editCareer")
        .mockResolvedValue(undefined);

      const { container } = render(
        <EditCareerModal
          mode="edit"
          selectedCareer={testCareer}
          setSelectedCareer={setSelectedCareer}
          closeModal={closeModal}
        />,
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      const fakeFile = new File(["dummy"], "barca.png", { type: "image/png" });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [fakeFile] } });
      });

      const submitBtn = screen.getByRole("button", { name: "Salvar" });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(uploadSpy).toHaveBeenCalledWith(fakeFile);
      expect(editCareerSpy).toHaveBeenCalledWith(
        "edit-2",
        ["#004d98", "#a50044"],
        "https://res.cloudinary.com/demo/image/upload/barca.png",
        "FC Barcelona",
        "Hansi Flick",
        expect.any(Date),
      );
      expect(setSelectedCareer).toHaveBeenCalledWith(
        expect.objectContaining({
          teamBadge: "https://res.cloudinary.com/demo/image/upload/barca.png",
        }),
      );
      expect(closeModal).toHaveBeenCalledTimes(1);
    });

    it('Modo "style": renderiza apenas AddClubImg e AddClubColors (sem EditInfoClub)', () => {
      const testCareer = career({
        id: "style-1",
        clubName: "Benfica",
        colorsTeams: ["#FF0000", "#FFFFFF"],
      });

      render(
        <EditCareerModal
          mode="style"
          selectedCareer={testCareer}
          setSelectedCareer={vi.fn()}
          closeModal={vi.fn()}
        />,
      );

      expect(screen.getByText("Toque para adicionar o escudo")).toBeDefined();
      expect(screen.getByText("CORES DO CLUBE")).toBeDefined();
      expect(screen.queryByText("INFORMAÇÕES DO CLUBE")).toBeNull();
      expect(screen.queryByText("Clube")).toBeNull();
      expect(screen.queryByText("Técnico")).toBeNull();
    });

    it('Modo "create": ao selecionar um clube existente no SearchableSelect, preenche automaticamente suas cores', async () => {
      vi.spyOn(ServiceClubBadges, "getAvailableClubsCatalog").mockResolvedValue({
        "fc barcelona": {
          name: "FC Barcelona",
          badge: "https://crests.football-data.org/81.png",
          colors: ["#a50044", "#004d98"],
        },
      });

      const { container } = render(
        <EditCareerModal
          mode="create"
          closeModal={vi.fn()}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });

      const clubInput = screen.getByPlaceholderText("Ex: FC Barcelona");
      await act(async () => {
        fireEvent.change(clubInput, { target: { value: "FC Barcelona" } });
      });

      const primaryColorInput = container.querySelector(
        'input[name="primaryColor"]',
      ) as HTMLInputElement;
      const secondaryColorInput = container.querySelector(
        'input[name="secondaryColor"]',
      ) as HTMLInputElement;

      expect(primaryColorInput.value).toBe("#a50044");
      expect(secondaryColorInput.value).toBe("#004d98");
    });
  });

  // ==========================================
  // 5. Integração com Teams (Salvar Cores no Mesmo Objeto)
  // ==========================================
  describe("buildTeamData e Salvamento de Cores no Objeto Teams", () => {
    it("anexa colors no mesmo objeto Teams ao criar time para season.teams", async () => {
      vi.spyOn(FootballDataService, "fetchTeamByClubName").mockResolvedValue({
        id: "81",
        name: "FC Barcelona",
        shortName: "Barça",
        badge: "https://crests.football-data.org/81.png",
      });
      vi.spyOn(ServiceClubBadges, "resolveClubColors").mockResolvedValue([
        "#a50044",
        "#004d98",
      ]);

      const teamData = await buildTeamData({
        opponentTeam: "FC Barcelona",
      });

      expect(teamData).toEqual({
        name: "FC Barcelona",
        badge: "https://crests.football-data.org/81.png",
        colors: ["#a50044", "#004d98"],
      });
    });
  });
});
