import { useState } from 'react';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('themes');

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="text-lg font-semibold">MacTheme</h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveView('themes')}
          >
            🎨 Themes
          </button>
          <button
            className={`nav-item ${activeView === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveView('editor')}
          >
            ✏️ Editor
          </button>
          <button
            className={`nav-item ${activeView === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveView('apps')}
          >
            📱 Apps
          </button>
          <button
            className={`nav-item ${activeView === 'wallpapers' ? 'active' : ''}`}
            onClick={() => setActiveView('wallpapers')}
          >
            🖼️ Wallpapers
          </button>
          <button
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
      </div>
      <div className="main-content">
        <div className="content-header">
          <h2 className="text-2xl font-bold capitalize">{activeView}</h2>
        </div>
        <div className="content-body">
          {activeView === 'themes' && (
            <div className="placeholder">
              <h3>Themes View</h3>
              <p>Theme browser will be implemented here</p>
            </div>
          )}
          {activeView === 'editor' && (
            <div className="placeholder">
              <h3>Theme Editor</h3>
              <p>Theme editor will be implemented here</p>
            </div>
          )}
          {activeView === 'apps' && (
            <div className="placeholder">
              <h3>Applications</h3>
              <p>Application manager will be implemented here</p>
            </div>
          )}
          {activeView === 'wallpapers' && (
            <div className="placeholder">
              <h3>Wallpapers</h3>
              <p>Wallpaper manager will be implemented here</p>
            </div>
          )}
          {activeView === 'settings' && (
            <div className="placeholder">
              <h3>Settings</h3>
              <p>Settings panel will be implemented here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
