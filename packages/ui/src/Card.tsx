import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';
import { classNames } from './classNames';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={classNames(styles.card, className)} {...props} />;
}

export function ParchmentCard({ className, ...props }: CardProps) {
  return <div className={classNames(styles.parchment, className)} {...props} />;
}
