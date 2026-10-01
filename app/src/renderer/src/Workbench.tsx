import { Button, Icon, strings, type IconName } from '@questline/ui';
import styles from './Workbench.module.css';

const bottomNav: { icon: IconName; label: string }[] = [
  { icon: 'tracker', label: strings.labels.tracker },
  { icon: 'agentMemory', label: strings.labels.agentMemory },
  { icon: 'settings', label: strings.workbench.settings },
];

export function Workbench() {
  return (
    <div className={styles.workbench}>
      <aside className={styles.sidebar} aria-label={strings.workbench.sidebar}>
        <div className={styles.brand}>
          <Icon name="logo" />
          {strings.appName}
        </div>
        <section className={styles.projects}>
          <h2 className={styles.sectionTitle}>{strings.workbench.projects}</h2>
          <p className={styles.empty}>{strings.workbench.noProjects}</p>
        </section>
        <nav className={styles.bottomNav}>
          {bottomNav.map(({ icon, label }) => (
            <Button key={icon} variant="ghost" className={styles.navButton}>
              <Icon name={icon} />
              {label}
            </Button>
          ))}
        </nav>
      </aside>
      <header className={styles.header} />
      <main className={styles.sessionPane}>
        <p className={styles.empty}>{strings.workbench.noSession}</p>
      </main>
    </div>
  );
}
