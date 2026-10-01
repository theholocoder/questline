import {
  ArrowCounterClockwise,
  BookOpenText,
  Check,
  Flag,
  Flask,
  GearSix,
  Info,
  Link,
  Lock,
  MapTrifold,
  Scroll,
  ShieldCheck,
  Stack,
  StarFour,
  Sword,
  Target,
  Trophy,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

/** Glyphs are named for what they stand for, in domain terms; the theme draws them as Phosphor duotone. */
const glyphs = {
  logo: Sword,
  settings: GearSix,
  spec: StarFour,
  ticket: Target,
  issue: Scroll,
  tracker: MapTrifold,
  agentMemory: BookOpenText,
  approvalProfile: ShieldCheck,
  run: Stack,
  info: Info,
  lock: Lock,
  check: Check,
  blocked: Link,
  flag: Flag,
  trophy: Trophy,
  rewind: ArrowCounterClockwise,
  flask: Flask,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof glyphs;

export interface IconProps {
  name: IconName;
  /** Announces the icon to assistive tech; without one it is decorative. */
  label?: string;
  size?: string | number;
  className?: string;
}

export function Icon({ name, label, size = '1.15em', className }: IconProps) {
  const Glyph = glyphs[name];
  return (
    <Glyph
      weight="duotone"
      size={size}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
