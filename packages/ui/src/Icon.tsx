import {
  BookOpenText,
  GearSix,
  MapTrifold,
  Scroll,
  ShieldCheck,
  Stack,
  StarFour,
  Sword,
  Target,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

/** Glyphs keyed by the domain term they stand for (plus the logo and Settings), drawn as Phosphor duotone. */
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
