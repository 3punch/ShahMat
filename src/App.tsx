import { useState } from 'react';
import { aiDeploy, aiDraft } from './game/ai';
import type { DeployedPiece } from './game/types';
import { BUDGET, TEAM_SIZE } from './game/types';
import DeployScreen from './components/DeployScreen';
import DraftScreen from './components/DraftScreen';
import GameScreen from './components/GameScreen';
import MainMenu from './components/MainMenu';

type Phase = 'menu' | 'draft' | 'deploy' | 'game';

interface Setups {
  gold: DeployedPiece[];
  azure: DeployedPiece[];
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [mode, setMode] = useState<'ai' | 'local'>('ai');
  const [draftSide, setDraftSide] = useState<'gold' | 'azure'>('gold');
  const [deploySide, setDeploySide] = useState<'gold' | 'azure'>('gold');
  const [armies, setArmies] = useState<{ gold: string[]; azure: string[] } | null>(null);
  const [setups, setSetups] = useState<Setups | null>(null);

  const start = (m: 'ai' | 'local') => {
    setMode(m);
    setDraftSide('gold');
    setDeploySide('gold');
    setArmies(null);
    setSetups(null);
    setPhase('draft');
  };

  const onDraftConfirm = (team: string[]) => {
    if (draftSide === 'gold') {
      if (mode === 'ai') {
        const enemy = aiDraft(TEAM_SIZE, BUDGET);
        setArmies({ gold: team, azure: enemy });
        setDeploySide('gold');
        setPhase('deploy');
      } else {
        setArmies({ gold: team, azure: [] });
        setDraftSide('azure');
      }
    } else {
      setArmies((prev) => ({ gold: prev!.gold, azure: team }));
      setDeploySide('gold');
      setPhase('deploy');
    }
  };

  const onDeployConfirm = (setup: DeployedPiece[]) => {
    if (deploySide === 'gold') {
      if (mode === 'ai') {
        const enemySetup = aiDeploy(armies!.azure);
        setSetups({ gold: setup, azure: enemySetup });
        setPhase('game');
      } else {
        setSetups({ gold: setup, azure: [] });
        setDeploySide('azure');
      }
    } else {
      setSetups((prev) => ({ gold: prev!.gold, azure: setup }));
      setPhase('game');
    }
  };

  const toMenu = () => {
    setPhase('menu');
    setArmies(null);
    setSetups(null);
  };

  if (phase === 'menu') return <MainMenu onChoose={start} />;

  if (phase === 'draft') {
    return (
      <DraftScreen
        key={draftSide}
        side={draftSide}
        onConfirm={onDraftConfirm}
      />
    );
  }

  if (phase === 'deploy' && armies) {
    return (
      <DeployScreen
        key={deploySide}
        army={deploySide === 'gold' ? armies.gold : armies.azure}
        side={deploySide}
        onConfirm={onDeployConfirm}
      />
    );
  }

  if (phase === 'game' && setups && armies) {
    return (
      <GameScreen
        mode={mode}
        goldSetup={setups.gold}
        azureSetup={setups.azure}
        onExit={toMenu}
      />
    );
  }

  // fallback
  return <MainMenu onChoose={start} />;
}
