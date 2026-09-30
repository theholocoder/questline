import styles from './Workbench.module.css';

const bottomNav = ['Quest Log', 'Grimoire', 'Settings'];

export function Workbench() {
  return (
    <div className={styles.workbench}>
      <aside className={styles.sidebar} aria-label="Sidebar">
        <div className={styles.brand}>Questline</div>
        <section className={styles.projects}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          <p className={styles.empty}>No Projects yet</p>
        </section>
        <nav className={styles.bottomNav}>
          {bottomNav.map((label) => (
            <button key={label} type="button" className={styles.navButton}>
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <header className={styles.header} />
      <main className={styles.workspace}>
        <p className={styles.empty}>No Session selected</p>
      </main>
    </div>
  );
}
