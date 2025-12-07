import { X } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  if (!isOpen) return null;

  // Get version from package.json (this would be injected in a real build)
  const version = '0.1.0';
  const appName = 'MacTheme';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content about-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>About {appName}</h3>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="about-content">
            {/* App Icon/Logo */}
            <div className="about-icon">
              <div className="app-icon-placeholder">
                <svg viewBox="0 0 100 100" className="app-icon-svg">
                  <defs>
                    <linearGradient id="themeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="45" fill="url(#themeGradient)" />
                  <path
                    d="M 30 40 L 40 30 L 60 30 L 70 40 L 70 60 L 60 70 L 40 70 L 30 60 Z"
                    fill="white"
                    opacity="0.9"
                  />
                  <circle cx="50" cy="50" r="8" fill="url(#themeGradient)" />
                </svg>
              </div>
            </div>

            {/* App Info */}
            <div className="about-info">
              <h2 className="app-name">{appName}</h2>
              <p className="app-version">Version {version}</p>
              <p className="app-description">
                Unified macOS theming system for terminals, editors, and applications.
              </p>
            </div>

            {/* Details */}
            <div className="about-details">
              <div className="detail-section">
                <h4>Credits</h4>
                <p>Developed by MacTheme Contributors</p>
                <p>Built with Electron, React, and TypeScript</p>
              </div>

              <div className="detail-section">
                <h4>Links</h4>
                <div className="links-list">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.electronAPI?.openExternal('https://github.com/mactheme/mactheme');
                    }}
                    className="about-link"
                  >
                    GitHub Repository
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.electronAPI?.openExternal('https://github.com/mactheme/mactheme/issues');
                    }}
                    className="about-link"
                  >
                    Report an Issue
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.electronAPI?.openExternal('https://github.com/mactheme/mactheme/blob/main/LICENSE');
                    }}
                    className="about-link"
                  >
                    License (MIT)
                  </a>
                </div>
              </div>

              <div className="detail-section">
                <h4>Acknowledgments</h4>
                <p className="acknowledgment-text">
                  Inspired by <a href="#" onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://github.com/omarchy/linux-themes');
                  }} className="inline-link">Omarchy's Linux theming system</a>.
                </p>
                <p className="acknowledgment-text">
                  Built on the shoulders of amazing open source projects.
                </p>
              </div>
            </div>

            {/* Copyright */}
            <div className="about-footer">
              <p className="copyright">
                © {new Date().getFullYear()} MacTheme Contributors. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
