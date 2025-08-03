import React, { useState, useCallback, FormEvent, useEffect } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { getTvShowDetails, fetchAllEpisodes } from './services/tmdbService';
import { TIER_RANKS, UNRANKED_POOL_ID } from './constants';
import type { Episode, Tiers, UnrankedSeasons, TvShowSearchResult } from './types';

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
  sourceInfo: { sourceTier: string; sourceSeason?: number };
  isOverlay?: boolean;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, sourceInfo, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `episode-${episode.id}`,
    data: { episode, sourceInfo },
    disabled: isOverlay,
  });
  
  const style = {
      opacity: isDragging ? 0.4 : 1,
      touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="w-32 h-20 sm:w-36 sm:h-24 md:w-40 md:h-28 bg-cover bg-center rounded-lg shadow-lg cursor-grab active:cursor-grabbing transform hover:scale-105 transition-transform duration-200 flex flex-col justify-end group"
      title={`T${episode.season_number}E${episode.episode_number}: ${episode.name}\n${episode.overview}`}
    >
        <div style={{ backgroundImage: `url(${episode.imageUrl})`}} className="w-full h-full bg-cover bg-center rounded-lg flex flex-col justify-end">
             <div className="bg-black bg-opacity-70 p-1 text-white text-center text-xs font-semibold rounded-b-lg truncate group-hover:whitespace-normal group-hover:overflow-visible">
                <p className="truncate">E{episode.episode_number}: {episode.name}</p>
            </div>
        </div>
    </div>
  );
};


interface TierRowProps {
  tierName: string;
  tierColor: string;
  tierTextColor?: string;
  episodes: Episode[];
}

const TierRow: React.FC<TierRowProps> = ({ tierName, tierColor, tierTextColor = 'text-white', episodes }) => {
  const { setNodeRef, isOver } = useDroppable({ id: tierName });

  return (
    <div className="flex flex-col sm:flex-row items-stretch mb-1">
      <div className={`w-full sm:w-20 h-12 sm:h-auto flex items-center justify-center font-bold text-2xl mr-0 sm:mr-2 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none ${tierColor} ${tierTextColor}`}>
        {tierName}
      </div>
      <div
        ref={setNodeRef}
        className={`tier-drop-zone flex-1 bg-slate-800 p-2 rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none min-h-[8rem] flex flex-wrap gap-1 sm:gap-2 items-start border-2 border-transparent transition-colors ${isOver ? 'drag-over' : ''}`}
      >
        {episodes.map(ep => (
          <EpisodeCard key={ep.id} episode={ep} sourceInfo={{ sourceTier: tierName }} />
        ))}
      </div>
    </div>
  );
};

interface UnrankedSeasonRowProps {
  seasonNum: number;
  episodes: Episode[];
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const UnrankedSeasonRow: React.FC<UnrankedSeasonRowProps> = ({ seasonNum, episodes, isCollapsed, toggleCollapse }) => {
  const { isOver, setNodeRef } = useDroppable({ id: `unranked-${seasonNum}` });

  if (!episodes || episodes.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 last:mb-0 bg-slate-900/70 rounded-lg">
      <button
        onClick={toggleCollapse}
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
            ref={setNodeRef}
            className={`tier-drop-zone flex flex-wrap gap-1 sm:gap-2 p-2 min-h-[8rem] border-2 border-transparent transition-colors ${isOver ? 'drag-over' : ''}`}
          >
            {episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} sourceInfo={{ sourceTier: UNRANKED_POOL_ID, sourceSeason: seasonNum }} />
            ))}
          </div>
        </div>
      </div>
    </div> 
  );
};


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
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveEpisode(event.active.data.current?.episode ?? null);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEpisode(null);
    const { active, over } = event;
    
    if (!over || !active.data.current) return;

    const itemData = active.data.current as { episode: Episode; sourceInfo: { sourceTier: string; sourceSeason?: number } };
    const { episode, sourceInfo } = itemData;
    const { sourceTier, sourceSeason } = sourceInfo;
    
    const overId = over.id as string;
    let targetTier: string;
    let targetSeason: number | undefined;

    if (overId.startsWith('unranked-')) {
        targetTier = UNRANKED_POOL_ID;
        targetSeason = parseInt(overId.split('-')[1], 10);
    } else {
        targetTier = overId;
    }

    if (targetTier === sourceTier && (sourceTier !== UNRANKED_POOL_ID || targetSeason === sourceSeason)) return;

    // State update logic
    setTiers(prevTiers => {
      const newTiers = { ...prevTiers };
      
      setUnrankedSeasons(prevSeasons => {
        const newSeasons = { ...prevSeasons };

        // Remove from source
        if (sourceTier === UNRANKED_POOL_ID && sourceSeason !== undefined) {
          if (newSeasons[sourceSeason]) {
            newSeasons[sourceSeason] = newSeasons[sourceSeason].filter(ep => ep.id !== episode.id);
          }
        } else if (newTiers[sourceTier]) {
          newTiers[sourceTier] = newTiers[sourceTier].filter(ep => ep.id !== episode.id);
        }

        // Add to destination
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

  const handleReset = () => {
    if (!selectedShow) return;
    if (window.confirm(`Tem certeza de que deseja redefinir a tier list para "${selectedShow.name}"? Todo o progresso será perdido.`)) {
      localStorage.removeItem(`tierListState_${selectedShow.id}`);
      loadShow(selectedShow.id);
    }
  };
  
  const seasonNumbers = Object.keys(unrankedSeasons).map(Number).sort((a,b) => a - b);
  const hasUnrankedEpisodes = seasonNumbers.some(num => unrankedSeasons[num]?.length > 0);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                  />
                ))}
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg">
                <h3 className="text-2xl font-bold text-center mb-4 border-b-2 border-purple-600 pb-2">Episódios Não Classificados</h3>
                {hasUnrankedEpisodes ? seasonNumbers.map(seasonNum => (
                    <UnrankedSeasonRow
                      key={seasonNum}
                      seasonNum={seasonNum}
                      episodes={unrankedSeasons[seasonNum] || []}
                      isCollapsed={!!collapsedSeasons[seasonNum]}
                      toggleCollapse={() => toggleSeasonCollapse(seasonNum)}
                    />
                )) : (
                  <p className="text-center text-gray-400 py-8">Todos os episódios foram classificados!</p>
                )}
              </div>
              </>
              )}
            </main>
          )}
        </div>
      </div>
      <DragOverlay>
        {activeEpisode ? <EpisodeCard episode={activeEpisode} sourceInfo={{ sourceTier: '' }} isOverlay={true} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default App;
