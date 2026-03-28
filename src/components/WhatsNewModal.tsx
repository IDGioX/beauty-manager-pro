import { useState } from 'react';
import { Sparkles, Download, X, Loader2 } from 'lucide-react';
import type { ReleaseInfo } from '../services/changelog';
import { changelogService } from '../services/changelog';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseInfo: ReleaseInfo;
}

// Semplice renderer markdown → JSX (h2, h3, liste, bold, testo)
function boldify(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:color-mix(in srgb, var(--color-primary) 12%, transparent);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>');
}

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1.5 my-3 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              <span
                className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}
              />
              <span dangerouslySetInnerHTML={{ __html: boldify(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3
          key={key++}
          className="font-semibold text-sm mt-5 mb-1.5 flex items-center gap-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span
            className="w-1 h-4 rounded-full"
            style={{ background: 'var(--color-primary)' }}
          />
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2
          key={key++}
          className="font-bold text-base mt-5 mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.match(/^[-*] /)) {
      listItems.push(line.replace(/^[-*] /, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p
          key={key++}
          className="text-sm my-1 leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
          dangerouslySetInnerHTML={{ __html: boldify(line) }}
        />
      );
    }
  }
  flushList();
  return elements;
}

function formatDateItalian(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function WhatsNewModal({ isOpen, onClose, releaseInfo }: WhatsNewModalProps) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      await changelogService.generatePdf(
        releaseInfo.version,
        releaseInfo.releaseDate,
        releaseInfo.releaseNotes
      );
    } catch (err) {
      console.error('Errore PDF:', err);
      setPdfError(true);
      setTimeout(() => setPdfError(false), 3000);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* Header con gradiente */}
        <div
          className="px-6 py-5 relative overflow-hidden"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          {/* Decorazione sfondo */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: 'var(--color-primary)', filter: 'blur(40px)', transform: 'translate(30%, -30%)' }}
          />

          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
              >
                <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">Novita</h2>
                <p className="text-xs text-white/60">Beauty Manager Pro</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Badge versione */}
          <div className="flex items-center gap-3 mt-4 relative">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              v{releaseInfo.version}
            </span>
            {releaseInfo.releaseDate && (
              <span className="text-xs text-white/50">
                {formatDateItalian(releaseInfo.releaseDate)}
              </span>
            )}
          </div>
        </div>

        {/* Body — release notes */}
        <div
          className="px-6 py-4 max-h-[50vh] overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 4%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)',
            }}
          >
            {renderMarkdown(releaseInfo.releaseNotes)}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfError ? 'Errore PDF' : 'Scarica PDF'}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            OK, chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
