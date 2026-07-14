import psg from '../assets/crests/france_paris-saint-germain.football-logos.cc.svg'
import liv from '../assets/crests/england_liverpool.football-logos.cc.svg'
import bvb from '../assets/crests/germany_borussia-dortmund.football-logos.cc.svg'
import mil from '../assets/crests/italy_milan.football-logos.cc.svg'
import mci from '../assets/crests/england_manchester-city.football-logos.cc.svg'
import rma from '../assets/crests/spain_real-madrid.football-logos.cc.svg'

export const footballTeams = [
    {
        id: "paris-saint-germain",
        name: "Paris Saint-Germain",
        shortName: "PSG",
        league: "Ligue 1",
        country: "France",
        crestUrl: psg,
    },
    {
        id: "liverpool",
        name: "Liverpool FC",
        shortName: "LIV",
        league: "Premier League",
        country: "England",
        crestUrl: liv,
    },
    {
        id: "borussia-dortmund",
        name: "Borussia Dortmund",
        shortName: "BVB",
        league: "Bundesliga",
        country: "Germany",
        crestUrl: bvb,
    },
    {
        id: "ac-milan",
        name: "AC Milan",
        shortName: "MIL",
        league: "Serie A",
        country: "Italy",
        crestUrl: mil,
    },
    {
        id: "manchester-city",
        name: "Manchester City",
        shortName: "MCI",
        league: "Premier League",
        country: "England",
        crestUrl: mci,
    },
    {
        id: "real-madrid",
        name: "Real Madrid",
        shortName: "RMA",
        league: "La Liga",
        country: "Spain",
        crestUrl: rma,
    }
];
