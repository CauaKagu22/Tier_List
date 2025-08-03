import { TvShowSearchResult, TvShowDetails, SeasonDetails, Episode } from '../types';

const API_KEY = 'eaadf4197870b697a540dbc26ed03cf6';
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/300x169/1f2937/6b7280.png?text=Sem+Imagem';

const fetcher = async <T,>(endpoint: string): Promise<T> => {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE_URL}/${endpoint}${separator}api_key=${API_KEY}&language=pt-BR`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from TMDB: ${response.statusText}`);
  }
  return response.json();
};

export const searchTvShows = async (query: string): Promise<TvShowSearchResult[]> => {
  if (!query) return [];
  const data = await fetcher<{ results: TvShowSearchResult[] }>(`search/tv?query=${encodeURIComponent(query)}`);
  return data.results;
};

export const getTvShowDetails = async (showId: number): Promise<TvShowDetails> => {
  return fetcher<TvShowDetails>(`tv/${showId}`);
};

export const getSeasonDetails = async (showId: number, seasonNumber: number): Promise<SeasonDetails> => {
  return fetcher<SeasonDetails>(`tv/${showId}/season/${seasonNumber}`);
};

export const fetchAllEpisodes = async (showId: number): Promise<Episode[]> => {
  const showDetails = await getTvShowDetails(showId);
  const seasonsToFetch = showDetails.seasons.filter(season => season.season_number > 0); // Exclude "Specials" (season 0)

  const seasonPromises = seasonsToFetch.map(season => 
    getSeasonDetails(showId, season.season_number)
  );
  
  const seasonsDetails = await Promise.all(seasonPromises);
  
  let allEpisodes: Episode[] = [];
  seasonsDetails.forEach(season => {
    const episodesWithImages = season.episodes.map(ep => ({
      ...ep,
      imageUrl: ep.still_path ? `${IMAGE_BASE_URL}${ep.still_path}` : PLACEHOLDER_IMAGE_URL,
    }));
    allEpisodes = [...allEpisodes, ...episodesWithImages];
  });

  return allEpisodes;
};