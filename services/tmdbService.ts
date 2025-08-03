import { TvShowSearchResult, TvShowDetails, SeasonDetails, Episode } from '../types';

const API_KEY = 'eaadf4197870b697a540dbc26ed03cf6';
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
export const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/300x169/1f2937/6b7280.png?text=Sem+Imagem';

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

// Helper to convert an image URL to a data URL (Base64) to prevent CORS issues with html2canvas
export const imageToDataUrl = async (url: string): Promise<string> => {
  if (url === PLACEHOLDER_IMAGE_URL) {
    return url;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Could not convert image to data URL: ${url}. Falling back to placeholder. Error:`, error);
    return PLACEHOLDER_IMAGE_URL;
  }
};


export const fetchAllEpisodes = async (showId: number): Promise<Episode[]> => {
  const showDetails = await getTvShowDetails(showId);
  const seasonsToFetch = showDetails.seasons.filter(season => season.season_number > 0); // Exclude "Specials" (season 0)

  const seasonPromises = seasonsToFetch.map(season => 
    getSeasonDetails(showId, season.season_number)
  );
  
  const seasonsDetails = await Promise.all(seasonPromises);
  
  const allEpisodes = seasonsDetails.flatMap(season =>
    season.episodes.map(ep => ({
      ...ep,
      imageUrl: ep.still_path ? `${IMAGE_BASE_URL}${ep.still_path}` : PLACEHOLDER_IMAGE_URL,
    }))
  );

  return allEpisodes;
};