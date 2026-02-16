/**
 * LogoBlock - Firmenlogo-Block für den ContractBuilder
 * Unterstützt URL-Eingabe und Datei-Upload
 */

import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Link, X, Loader2 } from 'lucide-react';
import { useContractBuilderStore } from '../../../stores/contractBuilderStore';
import styles from './LogoBlock.module.css';

interface LogoBlockProps {
  blockId: string;
  content: {
    logoUrl?: string;
    altText?: string;
    width?: number;
    height?: number;
    alignment?: 'left' | 'center' | 'right';
  };
  isSelected: boolean;
  isPreview: boolean;
}

export const LogoBlock: React.FC<LogoBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { logoUrl, altText = 'Firmenlogo', width = 150, alignment = 'left' } = content;
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { updateBlockContent } = useContractBuilderStore();

  const alignmentStyle: React.CSSProperties = {
    textAlign: alignment,
    display: 'flex',
    justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
  };

  // Datei zu Base64 konvertieren
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validierung
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Nur Bilder erlaubt (PNG, JPG, GIF, SVG, WebP)');
      return;
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      setError('Datei zu groß (max. 2MB)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        updateBlockContent(blockId, { logoUrl: base64 });
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError('Fehler beim Lesen der Datei');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Upload fehlgeschlagen');
      setIsUploading(false);
    }
  };

  // URL eingeben (nur http/https erlaubt)
  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          setError('Nur HTTP/HTTPS URLs sind erlaubt');
          return;
        }
      } catch {
        setError('Ungültige URL');
        return;
      }
      updateBlockContent(blockId, { logoUrl: trimmed });
      setShowUrlInput(false);
      setUrlInput('');
    }
  };

  // Logo entfernen
  const handleRemoveLogo = () => {
    updateBlockContent(blockId, { logoUrl: '' });
  };

  // Wenn kein Logo-URL vorhanden, Upload-Interface anzeigen
  if (!logoUrl) {
    return (
      <div
        className={`${styles.logoBlock} ${isSelected ? styles.selected : ''}`}
        style={alignmentStyle}
      >
        <div className={styles.placeholder}>
          <ImageIcon size={32} strokeWidth={1} />
          <span>Logo hier einfügen</span>

          {!isPreview && (
            <>
              {/* Upload Buttons */}
              <div className={styles.uploadActions}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className={styles.fileInput}
                />
                <button
                  className={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 size={16} className={styles.spinner} />
                  ) : (
                    <Upload size={16} />
                  )}
                  <span>{isUploading ? 'Lädt...' : 'Bild hochladen'}</span>
                </button>
                <button
                  className={styles.urlButton}
                  onClick={() => setShowUrlInput(true)}
                >
                  <Link size={16} />
                  <span>URL eingeben</span>
                </button>
              </div>

              {/* URL Input Modal */}
              {showUrlInput && (
                <div className={styles.urlInputWrapper}>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                    autoFocus
                  />
                  <button onClick={handleUrlSubmit}>OK</button>
                  <button onClick={() => setShowUrlInput(false)} aria-label="URL-Eingabe abbrechen"><X size={14} /></button>
                </div>
              )}

              {/* Error */}
              {error && <span className={styles.error}>{error}</span>}

              <span className={styles.hint}>
                PNG, JPG, GIF, SVG oder WebP (max. 2MB)
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.logoBlock} ${isSelected ? styles.selected : ''}`}
      style={alignmentStyle}
    >
      <div className={styles.logoWrapper}>
        <img
          src={logoUrl}
          alt={altText}
          className={styles.logo}
          style={{
            maxWidth: width,
            height: 'auto',
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
        <div className={styles.errorPlaceholder} style={{ display: 'none' }}>
          <span>Logo konnte nicht geladen werden</span>
        </div>

        {/* Remove Button (nur wenn selected und nicht preview) */}
        {isSelected && !isPreview && (
          <button
            className={styles.removeButton}
            onClick={handleRemoveLogo}
            title="Logo entfernen"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LogoBlock;
