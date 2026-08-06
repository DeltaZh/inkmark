import type { Tab } from '../state/tabsStore';

export type TabBarProps = {
  tabs: Tab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
};

export function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
}: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="打开的文档">
      <div className="tab-bar__list">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              className={`tab-bar__tab${active ? ' tab-bar__tab--active' : ''}`}
              role="tab"
              aria-selected={active}
              title={tab.path ?? tab.title}
            >
              <button
                type="button"
                className="tab-bar__label"
                onClick={() => onSelect(tab.id)}
              >
                <span className="tab-bar__title">
                  {tab.dirty ? '• ' : ''}
                  {tab.title}
                </span>
              </button>
              <button
                type="button"
                className="tab-bar__close"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                aria-label={`关闭「${tab.title}」`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="tab-bar__new"
        onClick={onNew}
        aria-label="新建文档"
        title="新建文档"
      >
        +
      </button>
    </div>
  );
}
