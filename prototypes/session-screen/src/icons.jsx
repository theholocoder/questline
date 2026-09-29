// PROTOTYPE, throwaway. One semantic icon name -> one glyph per icon set; each paper style picks a set.
import { createContext, useContext } from 'react';
import * as Pi from 'react-icons/pi';
import * as Gi from 'react-icons/gi';
import * as Lu from 'react-icons/lu';

const phosphor = {
  plan: 'PencilLine', implement: 'Hammer', review: 'Scales', quest: 'Scroll', main: 'StarFour', grimoire: 'BookOpenText',
  lock: 'Lock', logo: 'Sword', gear: 'GearSix', runs: 'Stack', info: 'Info', flask: 'Flask', rewind: 'ArrowCounterClockwise',
  flag: 'Flag', trophy: 'Trophy', map: 'MapTrifold', blocked: 'Link', objective: 'Target', check: 'Check',
};
const game = {
  plan: 'GiQuillInk', implement: 'GiAnvilImpact', review: 'GiScales', quest: 'GiScrollUnfurled', main: 'GiStarSwirl', grimoire: 'GiSpellBook',
  lock: 'GiPadlock', logo: 'GiCrossedSwords', gear: 'GiCog', runs: 'GiStack', info: 'GiInfo', flask: 'GiFizzingFlask', rewind: 'GiBackwardTime',
  flag: 'GiTowerFlag', trophy: 'GiTrophyCup', map: 'GiTreasureMap', blocked: 'GiWavyChains', objective: 'GiArcheryTarget', check: 'GiCheckMark',
};
const lucide = {
  plan: 'LuPenLine', implement: 'LuHammer', review: 'LuScale', quest: 'LuScrollText', main: 'LuSparkle', grimoire: 'LuBookOpen',
  lock: 'LuLock', logo: 'LuSwords', gear: 'LuSettings', runs: 'LuLayers', info: 'LuInfo', flask: 'LuFlaskConical', rewind: 'LuUndo2',
  flag: 'LuFlag', trophy: 'LuTrophy', map: 'LuMap', blocked: 'LuLink', objective: 'LuTarget', check: 'LuCheck',
};

const sets = {
  'phosphor-duotone': (n) => Pi['Pi' + phosphor[n] + 'Duotone'],
  'phosphor-fill': (n) => Pi['Pi' + phosphor[n] + 'Fill'],
  game: (n) => Gi[game[n]],
  lucide: (n) => Lu[lucide[n]],
};

export const IconSetCtx = createContext('phosphor-duotone');

export function Icon({ n, size = '1.15em', style }) {
  const set = useContext(IconSetCtx);
  const C = sets[set]?.(n);
  if (!C) return <span>•</span>;
  return <C size={size} aria-hidden style={{ verticalAlign: '-0.18em', flexShrink: 0, ...style }} />;
}
