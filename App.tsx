import React, { useState, useCallback, DragEvent, FormEvent, useEffect } from 'react';
import { getTvShowDetails, fetchAllEpisodes } from './services/tmdbService';
import { TIER_RANKS, UNRANKED_POOL_ID } from './constants';
import type { Episode, Tiers, UnrankedSeasons, TvShowSearchResult, DraggedItem } from './types';

// Sub-components defined within App.tsx for encapsulation

const Spinner: React.FC = () => (
  <svg className="animate-spin h-8 w-8 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ChevronIcon: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-6 w-6 text-yellow-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

interface EpisodeCardProps {
  episode: Episode;
  onDragStart: (e: DragEvent<HTMLDivElement>, item: DraggedItem) => void;
  sourceInfo: { sourceTier: string; sourceSeason?: number };
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, onDragStart, sourceInfo }) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, { episode, ...sourceInfo })}
    className="w-32 h-20 sm:w-36 sm:h-24 md:w-40 md:h-28 bg-cover bg-center rounded-lg shadow-lg cursor-grab active:cursor-grabbing transform hover:scale-105 transition-transform duration-200 flex flex-col justify-end group"
    style={{ backgroundImage: `url(${episode.imageUrl})` }}
    title={`T${episode.season_number}E${episode.episode_number}: ${episode.name}\n${episode.overview}`}
  >
    <div className="bg-black bg-opacity-70 p-1 text-white text-center text-xs font-semibold rounded-b-lg truncate group-hover:whitespace-normal group-hover:overflow-visible">
      <p className="truncate">E{episode.episode_number}: {episode.name}</p>
    </div>
  </div>
);

interface TierRowProps {
  tierName: string;
  tierColor: string;
  tierTextColor?: string;
  episodes: Episode[];
  onDrop: (e: DragEvent<HTMLDivElement>, targetTier: string) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, item: DraggedItem) => void;
}

const TierRow: React.FC<TierRowProps> = ({ tierName, tierColor, tierTextColor = 'text-white', episodes, onDrop, onDragOver, onDragStart }) => (
  <div className="flex flex-col sm:flex-row items-stretch mb-1">
    <div className={`w-full sm:w-20 h-12 sm:h-auto flex items-center justify-center font-bold text-2xl mr-0 sm:mr-2 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none ${tierColor} ${tierTextColor}`}>
      {tierName}
    </div>
    <div
      onDrop={(e) => onDrop(e, tierName)}
      onDragOver={onDragOver}
      onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('drag-over')}
      onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('drag-over')}
      className="tier-drop-zone flex-1 bg-slate-800 p-2 rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none min-h-[8rem] flex flex-wrap gap-1 sm:gap-2 items-start border-2 border-transparent transition-colors"
    >
      {episodes.map(ep => (
        <EpisodeCard key={ep.id} episode={ep} onDragStart={onDragStart} sourceInfo={{ sourceTier: tierName }} />
      ))}
    </div>
  </div>
);


// Main App Component
const App: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [selectedShow, setSelectedShow] = useState<TvShowSearchResult | null>(null);

  const [tiers, setTiers] = useState<Tiers>(
    TIER_RANKS.reduce((acc, tier) => ({ ...acc, [tier.name]: [] }), {})
  );
  const [unrankedSeasons, setUnrankedSeasons] = useState<UnrankedSeasons>({});
  const [collapsedSeasons, setCollapsedSeasons] = useState<Record<number, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSeasonCollapse = (seasonNum: number) => {
    setCollapsedSeasons(prev => ({ ...prev, [seasonNum]: !prev[seasonNum] }));
  };
  
  const loadShow = useCallback(async (showId: number) => {
    setLoading(true);
    setError(null);
    setSelectedShow(null);
    setTiers(TIER_RANKS.reduce((acc, tier) => ({ ...acc, [tier.name]: [] }), {}));
    setUnrankedSeasons({});
    setCollapsedSeasons({});

    try {
      const showDetails = await getTvShowDetails(showId);
      const showSummary: TvShowSearchResult = {
        id: showDetails.id,
        name: showDetails.name,
        first_air_date: showDetails.first_air_date,
        poster_path: showDetails.poster_path,
      };
      setSelectedShow(showSummary);
      
      const savedStateJSON = localStorage.getItem(`tierListState_${showId}`);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        setTiers(savedState.tiers);
        setUnrankedSeasons(savedState.unrankedSeasons);
      } else {
        const episodes = await fetchAllEpisodes(showId);
        const seasons: UnrankedSeasons = {};
        episodes.forEach(ep => {
          if (!seasons[ep.season_number]) {
            seasons[ep.season_number] = [];
          }
          seasons[ep.season_number].push(ep);
        });
        setUnrankedSeasons(seasons);
      }

    } catch (err) {
      setError(`Falha ao carregar episódios. Verifique o link ou tente outra série.`);
      setSelectedShow(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Pré-carrega Bojack Horseman (ID 61222) na primeira vez
    loadShow(61222);
  }, [loadShow]);

  // Salva o estado no localStorage sempre que as tiers ou episódios não classificados mudam
  useEffect(() => {
    if (selectedShow && !loading) {
      const stateToSave = { tiers, unrankedSeasons };
      localStorage.setItem(`tierListState_${selectedShow.id}`, JSON.stringify(stateToSave));
    }
  }, [tiers, unrankedSeasons, selectedShow, loading]);

  const handleLoadFromUrl = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const match = urlInput.match(/\/tv\/(\d+)/);
    if (!match || !match[1]) {
      setError("URL do TMDB inválida. Use um formato como 'https://www.themoviedb.org/tv/12345-show-name'.");
      return;
    }
    const showId = parseInt(match[1], 10);
    await loadShow(showId);
  };

  const handleDragStart = (e: DragEvent, item: DraggedItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: DragEvent, targetTier: string, targetSeason?: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).classList.remove('drag-over');
    const item: DraggedItem = JSON.parse(e.dataTransfer.getData('application/json'));
    
    const { episode, sourceTier, sourceSeason } = item;

    if (targetTier === sourceTier && (sourceTier !== UNRANKED_POOL_ID || targetSeason === sourceSeason)) return;

    setTiers(prevTiers => {
      const newTiers = { ...prevTiers };
      
      setUnrankedSeasons(prevSeasons => {
        const newSeasons = { ...prevSeasons };

        if (sourceTier === UNRANKED_POOL_ID && sourceSeason !== undefined) {
          newSeasons[sourceSeason] = newSeasons[sourceSeason].filter(ep => ep.id !== episode.id);
        } else if (newTiers[sourceTier]) {
          newTiers[sourceTier] = newTiers[sourceTier].filter(ep => ep.id !== episode.id);
        }

        if (targetTier === UNRANKED_POOL_ID && targetSeason !== undefined) {
           if (!newSeasons[targetSeason]) newSeasons[targetSeason] = [];
           newSeasons[targetSeason].push(episode);
           newSeasons[targetSeason].sort((a,b) => a.episode_number - b.episode_number);
        } else if (newTiers[targetTier]) {
          if (!newTiers[targetTier]) newTiers[targetTier] = [];
          newTiers[targetTier].push(episode);
        }
        
        return newSeasons;
      });

      return newTiers;
    });
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleReset = () => {
    if (!selectedShow) return;
    if (window.confirm(`Tem certeza de que deseja redefinir a tier list para "${selectedShow.name}"? Todo o progresso será perdido.`)) {
      localStorage.removeItem(`tierListState_${selectedShow.id}`);
      loadShow(selectedShow.id);
    }
  };
  
  const seasonNumbers = Object.keys(unrankedSeasons).map(Number).sort((a,b) => a - b);

  return (
    <div className="text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">
        <header className="text-center mb-8">
          {/* Header content removed as per user request */}
        </header>

        <div className="max-w-2xl mx-auto relative mb-8">
          <form onSubmit={handleLoadFromUrl} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                  setUrlInput(e.target.value);
                  setError(null);
              }}
              placeholder="Cole o link do TMDB, ex: https://www.themoviedb.org/tv/61222-bojack-horseman"
              className="flex-grow bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600 transition text-white placeholder-gray-400"
              aria-label="URL da Série no TMDB"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900 disabled:cursor-not-allowed rounded-lg px-6 py-3 font-semibold transition flex items-center justify-center w-full sm:w-40"
            >
              {loading ? <Spinner /> : 'Carregar Série'}
            </button>
          </form>
        </div>
        
        {(loading && !selectedShow) && (
          <div className="text-center mt-12 flex flex-col items-center">
            <Spinner />
            <p className="mt-4 text-lg text-gray-300">Carregando série...</p>
          </div>
        )}

        {error && <p className="text-center mt-8 text-yellow-300 bg-purple-900/60 p-4 rounded-lg border border-yellow-500">{error}</p>}

        {selectedShow && (
          <main className="mt-10">
             <div className="text-center mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <h2 className="text-3xl font-bold text-yellow-400">{selectedShow.name}</h2>
              <button
                onClick={handleReset}
                className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                title="Redefinir a tier list desta série"
              >
                Redefinir
              </button>
            </div>
            {loading ? (
                <div className="text-center mt-12 flex flex-col items-center">
                    <Spinner />
                    <p className="mt-4 text-lg text-gray-300">Carregando episódios...</p>
                </div>
            ) : (
            <>
            <div className="mb-8">
              {TIER_RANKS.map(tier => (
                <TierRow
                  key={tier.name}
                  tierName={tier.name}
                  tierColor={tier.color}
                  tierTextColor={tier.textColor}
                  episodes={tiers[tier.name] || []}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>

            <div className="bg-slate-800/60 p-4 rounded-lg">
              <h3 className="text-2xl font-bold text-center mb-4 border-b-2 border-purple-600 pb-2">Episódios Não Classificados</h3>
              {seasonNumbers.length > 0 ? seasonNumbers.map(seasonNum => {
                const isCollapsed = !!collapsedSeasons[seasonNum];
                return (
                  unrankedSeasons[seasonNum]?.length > 0 && (
                   <div key={seasonNum} className="mb-2 last:mb-0 bg-slate-900/70 rounded-lg">
                      <button
                        onClick={() => toggleSeasonCollapse(seasonNum)}
                        className="w-full flex justify-between items-center p-3 text-left hover:bg-slate-700/50 transition-colors rounded-t-lg"
                        aria-expanded={!isCollapsed}
                        aria-controls={`season-content-${seasonNum}`}
                      >
                          <h4 className="text-xl font-semibold text-yellow-400">Temporada {seasonNum}</h4>
                          <ChevronIcon isCollapsed={isCollapsed} />
                      </button>
                      <div
                          id={`season-content-${seasonNum}`}
                          className={`grid transition-all duration-500 ease-in-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
                      >
                        <div className="overflow-hidden">
                          <div 
                            className="tier-drop-zone flex flex-wrap gap-1 sm:gap-2 p-2 min-h-[8rem] border-2 border-transparent transition-colors"
                            onDrop={(e) => handleDrop(e, UNRANKED_POOL_ID, seasonNum)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('drag-over')}
                            onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('drag-over')}
                          >
                            {unrankedSeasons[seasonNum].map(ep => (
                              <EpisodeCard key={ep.id} episode={ep} onDragStart={handleDragStart} sourceInfo={{ sourceTier: UNRANKED_POOL_ID, sourceSeason: seasonNum }} />
                            ))}
                          </div>
                        </div>
                       </div>
                   </div> 
                  )
                )
              }) : (
                <p className="text-center text-gray-400 py-8">Todos os episódios foram classificados!</p>
              )}
            </div>
            </>
            )}
          </main>
        )}
      </div>
    </div>
  );
};

export default App;
