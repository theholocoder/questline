import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';
import { classNames } from './classNames';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
}

export function Button({ variant = 'default', size = 'md', type = 'button', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        styles.button,
        variant !== 'default' && styles[variant],
        size === 'sm' && styles.sm,
        className,
      )}
      {...props}
    />
  );
}
