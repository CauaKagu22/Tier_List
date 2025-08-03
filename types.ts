
export interface TvShowSearchResult {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
}

export interface TvShowDetails {
  id: number;
  name: string;
  number_of_seasons: number;
  first_air_date: string;
  poster_path: string | null;
  seasons: {
    air_date: string | null;
    episode_count: number;
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
  }[];
}

export interface SeasonDetails {
  _id: string;
  air_date: string;
  episodes: Episode[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  air_date: string | null;
  // Custom property for the UI
  imageUrl?: string; 
}

export interface Tier {
  name: string;
  color: string;
  textColor?: string;
}

export type Tiers = Record<string, Episode[]>;

export type UnrankedSeasons = Record<number, Episode[]>;

export interface DraggedItem {
  episode: Episode;
  sourceTier: string;
  sourceSeason?: number;
}