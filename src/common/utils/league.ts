import { League } from "../interfaces/League";

type CountryLeagues = {
  [country: string]: League[];
};

type ContinentLeagues = {
  [continent: string]: CountryLeagues;
};

export const leaguesByContinent: ContinentLeagues = {
  Europa: {
    UEFA: [
      {
        name: "Champions League",
        logo: "/images/leagues/uefa/championsLeague.png",
        trophy: "/images/trophies/uefa/championsLeague.png",
      },
      {
        name: "Europa League",
        logo: "/images/leagues/uefa/europaLeague.png",
        trophy: "/images/trophies/uefa/europaLeague.png",
      },
      {
        name: "Conference League",
        logo: "/images/leagues/uefa/conferenceLeague.png",
        trophy: "/images/trophies/uefa/conferenceLeague.png",
      },
      {
        name: "UEFA Super Cup",
        logo: "/images/leagues/uefa/uefaSupercopa.png",
        trophy: "/images/trophies/uefa/uefaSupercopa.png",
      },
    ],
    Espanha: [
      {
        name: "La Liga",
        logo: "/images/leagues/spain/laliga.png",
        trophy: "/images/trophies/spain/laliga.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Copa do Rey",
        logo: "/images/leagues/spain/copaDoRey.png",
        trophy: "/images/trophies/spain/copaDoRey.png",
      },
      {
        name: "Supercopa",
        logo: "/images/leagues/spain/supercopa.png",
        trophy: "/images/trophies/spain/supercopa.png",
      },
      {
        name: "La liga 2",
        logo: "/images/leagues/spain/laliga2.png",
        trophy: "/images/trophies/spain/laliga2.png",
        league: true,
        isFirstDivision: false,
      },
    ],
    Inglaterra: [
      {
        name: "Premier League",
        logo: "/images/leagues/england/premierLeague.png",
        trophy: "/images/trophies/england/premierLeague.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "FA Cup",
        logo: "/images/leagues/england/faCup.png",
        trophy: "/images/trophies/england/faCup.png",
      },
      {
        name: "Carabao Cup",
        logo: "/images/leagues/england/carabao.png",
        trophy: "/images/trophies/england/carabao.png",
      },
      {
        name: "Community Shield",
        logo: "/images/leagues/england/communityShield.png",
        trophy: "/images/trophies/england/communityShield.png",
      },
      {
        name: "Championship",
        logo: "/images/leagues/england/championship.png",
        trophy: "/images/trophies/england/championship.png",
        league: true,
        isFirstDivision: false,
      },
      {
        name: "League One",
        logo: "/images/leagues/england/leagueOne.png",
        trophy: "/images/trophies/england/leagueOne.png",
        league: true,
        isFirstDivision: false,
      },
      {
        name: "League Two",
        logo: "/images/leagues/england/leagueTwo.png",
        trophy: "/images/trophies/england/leagueTwo.png",
        league: true,
        isFirstDivision: false,
      },
      {
        name: "BSM",
        logo: "/images/leagues/england/bsm.png",
        trophy: "/images/trophies/england/bsm.png",
      },
    ],
    Itália: [
      {
        name: "Serie A",
        logo: "/images/leagues/italy/serieA.png",
        trophy: "/images/trophies/italy/serieA.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Coppa Itália",
        logo: "/images/leagues/italy/coppaItalia.png",
        trophy: "/images/trophies/italy/coppaItalia.png",
      },
      {
        name: "Supercoppa",
        logo: "/images/leagues/italy/supercopa.png",
        trophy: "/images/trophies/italy/supercopa.png",
      },
      {
        name: "Serie B",
        logo: "/images/leagues/italy/serieB.png",
        trophy: "/images/trophies/italy/serieB.png",
        league: true,
        isFirstDivision: false,
      },
    ],
    Alemanha: [
      {
        name: "Bundesliga",
        logo: "/images/leagues/germany/bundesliga.png",
        trophy: "/images/trophies/germany/bundesliga.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "DFB-Pokal",
        logo: "/images/leagues/germany/pokal.png",
        trophy: "/images/trophies/germany/pokal.png",
      },
      {
        name: "Supercup",
        logo: "/images/leagues/germany/supercopa.png",
        trophy: "/images/trophies/germany/supercopa.png",
      },
      {
        name: "Bundesliga 2",
        logo: "/images/leagues/germany/bundesliga2.png",
        trophy: "/images/trophies/germany/bundesliga2.png",
        league: true,
        isFirstDivision: false,
      },
      {
        name: "3. Liga",
        logo: "/images/leagues/germany/3liga.png",
        trophy: "/images/trophies/germany/3liga.png",
        league: true,
        isFirstDivision: false,
      },
    ],
    França: [
      {
        name: "Ligue 1",
        logo: "/images/leagues/france/ligue1.png",
        trophy: "/images/trophies/france/ligue1.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Coupe de France",
        logo: "/images/leagues/france/coupeDeFrance.png",
        trophy: "/images/trophies/france/coupeDeFrance.png",
      },
      {
        name: "Trophée des Champions",
        logo: "/images/leagues/france/tropheeDesChampions.png",
        trophy: "/images/trophies/france/tropheeDesChampions.png",
      },
      {
        name: "Ligue 2",
        logo: "/images/leagues/france/ligue2.png",
        trophy: "/images/trophies/france/ligue2.png",
        league: true,
        isFirstDivision: false,
      },
      {
        name: "Barrages Ligue 1",
        logo: "/images/leagues/france/barragesLigue1.png",
        trophy: "/images/trophies/france/ligue2.png",
        league: true,
        isFirstDivision: false,
      },
    ],
    Portugal: [
      {
        name: "Liga Portugal",
        logo: "/images/leagues/portugal/ligaPortugal.png",
        trophy: "/images/trophies/portugal/ligaPortugal.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Taça Portuguesa",
        logo: "/images/leagues/portugal/copaPortugal.png",
        trophy: "/images/trophies/portugal/copaPortugal.png",
      },
    ],
    Holanda: [
      {
        name: "Eredivisie",
        logo: "/images/leagues/netherlands/eredivisie.png",
        trophy: "/images/trophies/netherlands/eredivisie.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Oranje Beker",
        logo: "/images/leagues/netherlands/oranjeBeker.png",
        trophy: "/images/trophies/netherlands/oranjeBeker.png",
      },
    ],
    Turquia: [
      {
        name: "Süper Lig",
        logo: "/images/leagues/turkiye/ligaTurca.png",
        trophy: "/images/trophies/turkiye/ligaTurca.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Türkiye Kupası",
        logo: "/images/leagues/turkiye/copaTurca.png",
        trophy: "/images/trophies/turkiye/copaTurca.png",
      },
    ],
    Escócia: [
      {
        name: "Scottish Premiership",
        logo: "/images/leagues/scotland/scottishPremiership.png",
        trophy: "/images/trophies/scotland/scottishPremiership.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Scottish Cup",
        logo: "/images/leagues/scotland/scottishCup.png",
        trophy: "/images/trophies/scotland/scottishCup.png",
      },
    ],
    Roménia: [
      {
        name: "SUPERLIGA",
        logo: "/images/leagues/romenia/superliga.png",
        trophy: "/images/trophies/romenia/superliga.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Cupa Națională",
        logo: "/images/leagues/romenia/copaRomena.png",
        trophy: "/images/trophies/romenia/copaRomena.png",
      },
    ],
  },
  América: {
    Conmebol: [
      {
        name: "Libertadores",
        logo: "/images/leagues/conmebol/libertadores.png",
        trophy: "/images/trophies/conmebol/libertadores.png",
      },
      {
        name: "Sul Americana",
        logo: "/images/leagues/conmebol/sulamericana.png",
        trophy: "/images/trophies/conmebol/sulamericana.png",
      },
      {
        name: "CONMEBOL Recopa",
        logo: "/images/leagues/conmebol/recopa.png",
        trophy: "/images/trophies/conmebol/recopa.png",
      },
    ],
    Brasil: [
      {
        name: "Brasileirão",
        logo: "/images/leagues/brasil/brasileirao.png",
        trophy: "/images/trophies/brasil/brasileirao.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "Copa do Brasil",
        logo: "/images/leagues/brasil/copaDoBrasil.png",
        trophy: "/images/trophies/brasil/copaDoBrasil.png",
      },
    ],
    Argentina: [
      {
        name: "Torneo Apertura",
        logo: "/images/leagues/argentina/ligaArgentina.png",
        trophy: "/images/trophies/argentina/ligaArgentina.png",
      },
      {
        name: "Torneo Clausura",
        logo: "/images/leagues/argentina/ligaArgentina.png",
        trophy: "/images/trophies/argentina/ligaArgentina.png",
      },
    ],

    "Estados Unidos": [
      {
        name: "MLS",
        logo: "/images/leagues/usa/mls.png",
        trophy: "/images/trophies/usa/mls.png",
        league: true,
        isFirstDivision: true,
      },
      {
        name: "U.S. Open Cup",
        logo: "/images/leagues/usa/openCup.png",
        trophy: "/images/trophies/usa/openCup.png",
      },
    ],
  },
  Asia: {
    AFC: [
      {
        name: "AFC Champions League",
        logo: "/images/leagues/afc/championsAsia.png",
        trophy: "/images/trophies/afc/championsAsia.png",
      },
    ],
    Arabia: [
      {
        name: "ROSHN Saudi League",
        logo: "/images/leagues/arabia/ligaArabia.png",
        trophy: "/images/trophies/arabia/ligaArabia.png",
        league: true,
        isFirstDivision: true,
      },
    ],
  },
};

export const continentalLeagueByCountry: Record<string, string | undefined> = {
  Espanha: "UEFA",
  Inglaterra: "UEFA",
  Itália: "UEFA",
  Alemanha: "UEFA",
  França: "UEFA",
  Portugal: "UEFA",
  Holanda: "UEFA",
  Turquia: "UEFA",
  Escócia: "UEFA",
  Roménia: "UEFA",
  Brasil: "Conmebol",
  Argentina: "Conmebol",
  Arabia: "AFC",
};
