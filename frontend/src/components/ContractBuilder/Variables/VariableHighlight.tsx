/**
 * VariableHighlight - Hebt {{variablen}} im Text hervor
 * Unterstützt: System-Variablen ({{heute}}), Berechnungen ({{preis * 1.19}})
 *
 * UX-Verbesserung: Zeigt lesbare Namen statt {{syntax}} an
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useContractBuilderStore, Variable } from '../../../stores/contractBuilderStore';
import { resolveSmartVariable } from '../../../utils/smartVariables';
import styles from './VariableHighlight.module.css';

interface VariableHighlightProps {
  text: string;
  multiline?: boolean;
  isPreview?: boolean; // Im Preview/PDF-Modus: Keine farbigen Hervorhebungen
  onDoubleClick?: () => void; // Callback für Inline-Editing
}

// Regex für {{variable_name}} oder {{berechnung}}
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

// Variable-Name zu lesbarem Label konvertieren
const toReadableLabel = (varName: string): string => {
  return varName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const VariableHighlight: React.FC<VariableHighlightProps> = ({
  text,
  multiline = false,
  isPreview = false,
  onDoubleClick,
}) => {
  const { document: currentDocument, addVariable, syncVariables, setSelectedVariable } = useContractBuilderStore();

  // Inline-Editing State
  const [editingVarName, setEditingVarName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingClickRef = useRef<{varName: string; value: string} | null>(null);
  const variables = currentDocument?.content.variables || [];

  // Variable-Werte als Map für Berechnungen
  const variableValuesMap = useMemo(() => {
    const map = new Map<string, string | number>();
    variables.forEach((v: Variable) => {
      if (v.value !== undefined && v.value !== '') {
        // Name ohne {{ }} speichern
        const cleanName = v.name.replace(/^\{\{|\}\}$/g, '');
        // Date zu String konvertieren
        if (v.value instanceof Date) {
          map.set(cleanName, v.value.toLocaleDateString('de-DE'));
        } else {
          map.set(cleanName, v.value);
        }
      }
    });
    return map;
  }, [variables]);

  // Text in Segmente aufteilen
  const segments = useMemo(() => {
    const result: Array<{
      type: 'text' | 'variable';
      content: string;
      variableName?: string;
      value?: string;
      isFilled?: boolean;
      varType?: 'system' | 'computed' | 'user';
    }> = [];

    let lastIndex = 0;
    let match;

    // Reset regex
    VARIABLE_PATTERN.lastIndex = 0;

    while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
      // Text vor der Variable
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      // Variable finden und Smart-Auflösung versuchen
      const variableName = match[1].trim();
      const resolved = resolveSmartVariable(variableName, variableValuesMap);

      // Für normale User-Variablen: Wert aus Store holen falls nicht resolved
      let finalValue = resolved.value;
      let hasValue = finalValue !== null && finalValue !== '';

      if (resolved.type === 'user' && !hasValue) {
        const variable = variables.find((v: { name: string }) => v.name === `{{${variableName}}}`);
        if (variable?.value !== undefined && variable?.value !== '') {
          finalValue = String(variable.value);
          hasValue = true;
        }
      }

      result.push({
        type: 'variable',
        content: match[0],
        variableName,
        value: hasValue ? finalValue! : undefined,
        isFilled: hasValue,
        varType: resolved.type,
      });

      lastIndex = match.index + match[0].length;
    }

    // Rest des Texts
    if (lastIndex < text.length) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return result;
  }, [text, variables, variableValuesMap]);

  // Umlaute normalisieren für Matching (ä→ae, ö→oe, ü→ue, ß→ss)
  const normalizeUmlauts = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
  };

  // Focus Input wenn Editing startet
  useEffect(() => {
    if (editingVarName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingVarName]);

  // Variable auswählen und Inline-Editing starten
  const handleVariableClick = useCallback((variableName: string, varType?: string, currentValue?: string) => {
    // System-Variablen sind nicht editierbar
    if (varType === 'system' || varType === 'computed') return;

    // Zuerst syncVariables aufrufen, um sicherzustellen, dass alle Variablen existieren
    syncVariables();

    // Normalisiere den gesuchten Namen für Umlaut-Toleranz
    const normalizedSearch = normalizeUmlauts(variableName);

    // Finde die Variable - mit Umlaut-Normalisierung
    const variable = variables.find((v: Variable) => {
      const varNameClean = v.name.replace(/^\{\{|\}\}$/g, '');
      const normalizedVarName = normalizeUmlauts(varNameClean);

      return normalizedVarName === normalizedSearch ||
             v.name === `{{${variableName}}}` ||
             v.name === variableName;
    });

    // Falls Variable nicht existiert, automatisch erstellen
    if (!variable) {

      // Gruppe basierend auf Variablennamen bestimmen
      let group = 'Allgemein';
      const lowerName = variableName.toLowerCase();
      if (lowerName.includes('auftraggeber') || lowerName.includes('verkaeufer') || lowerName.includes('kaeufer')) {
        group = lowerName.includes('auftraggeber') || lowerName.includes('verkaeufer') ? 'Auftraggeber' : 'Auftragnehmer';
      } else if (lowerName.includes('auftragnehmer')) {
        group = 'Auftragnehmer';
      } else if (lowerName.includes('preis') || lowerName.includes('betrag')) {
        group = 'Finanzen';
      }

      // Typ basierend auf Variablennamen
      let type: 'text' | 'email' | 'phone' | 'date' | 'currency' = 'text';
      if (lowerName.includes('email') || lowerName.includes('mail')) type = 'email';
      else if (lowerName.includes('telefon') || lowerName.includes('phone')) type = 'phone';
      else if (lowerName.includes('datum')) type = 'date';
      else if (lowerName.includes('preis') || lowerName.includes('betrag')) type = 'currency';

      const newVar = {
        name: `{{${variableName}}}`,
        displayName: toReadableLabel(variableName),
        type,
        required: true,
        group,
        linkedBlocks: [],
      };

      addVariable(newVar);

      // Nach dem Hinzufügen direkt Inline-Editing starten + Sidebar sync
      setTimeout(() => {
        setEditingVarName(variableName);
        setEditValue(currentValue || '');

        // Neu erstellte Variable in Sidebar auswählen
        const updatedVars = useContractBuilderStore.getState().document?.content.variables || [];
        const newVar = updatedVars.find((v: Variable) => v.name === `{{${variableName}}}`);
        if (newVar) {
          setSelectedVariable(newVar.id);
        }
      }, 50);
      return;
    }

    // Variable gefunden - Inline-Editing starten + Sidebar synchronisieren
    setEditingVarName(variableName);
    setEditValue(currentValue || (variable.value ? String(variable.value) : ''));

    // Sidebar mit kurzem Delay synchronisieren (vermeidet Wackeln)
    setTimeout(() => {
      setSelectedVariable(variable.id);
    }, 50);
  }, [variables, syncVariables, addVariable, currentDocument, normalizeUmlauts, setSelectedVariable]);

  // Inline-Edit speichern
  const handleSaveEdit = useCallback(() => {
    if (!editingVarName) return;

    // WICHTIG: Aktuelle Variables aus dem Store holen, NICHT aus der Closure!
    // Die Closure hat möglicherweise veraltete Daten wenn eine Variable gerade erstellt wurde
    const currentState = useContractBuilderStore.getState();
    const currentVariables = currentState.document?.content.variables || [];

    // Variable finden
    const variable = currentVariables.find((v: Variable) => {
      const varNameClean = v.name.replace(/^\{\{|\}\}$/g, '');
      return varNameClean === editingVarName || v.name === `{{${editingVarName}}}`;
    });

    if (variable) {
      const trimmedValue = editValue.trim();

      // VALIDIERUNG: Typ-spezifische Prüfung
      if (trimmedValue) {
        // E-Mail Validierung
        if (variable.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmedValue)) {
            alert('Bitte geben Sie eine gültige E-Mail-Adresse ein (z.B. name@beispiel.de)');
            return; // Nicht speichern, Edit bleibt offen
          }
        }

        // Telefon Validierung (mindestens 6 Ziffern)
        if (variable.type === 'phone') {
          const digitsOnly = trimmedValue.replace(/[^0-9]/g, '');
          if (digitsOnly.length < 6) {
            alert('Bitte geben Sie eine gültige Telefonnummer ein (mindestens 6 Ziffern)');
            return; // Nicht speichern, Edit bleibt offen
          }
        }

        // IBAN Validierung (beginnt mit 2 Buchstaben, dann mindestens 15 Zeichen)
        if (variable.type === 'iban') {
          const ibanClean = trimmedValue.replace(/\s/g, '').toUpperCase();
          if (!/^[A-Z]{2}[0-9A-Z]{15,32}$/.test(ibanClean)) {
            alert('Bitte geben Sie eine gültige IBAN ein (z.B. DE89370400440532013000)');
            return; // Nicht speichern, Edit bleibt offen
          }
        }
      }

      // Wert über Store setzen
      currentState.updateVariable(variable.id, trimmedValue);
    }

    // Prüfe ob ein Klick auf eine andere Variable pending ist
    const pending = pendingClickRef.current;
    if (pending) {
      // Wechsle direkt zur nächsten Variable ohne zu schließen
      pendingClickRef.current = null;
      setEditingVarName(pending.varName);
      setEditValue(pending.value);

      // Sidebar synchronisieren (mit kurzem Delay für flüssige UX)
      setTimeout(() => {
        const latestVars = useContractBuilderStore.getState().document?.content.variables || [];
        const nextVar = latestVars.find((v: Variable) => {
          const cleanName = v.name.replace(/^\{\{|\}\}$/g, '');
          return cleanName === pending.varName || v.name === `{{${pending.varName}}}`;
        });
        if (nextVar) {
          setSelectedVariable(nextVar.id);
        }
      }, 50);
    } else {
      // Kein pending Klick - normal schließen
      setEditingVarName(null);
      setEditValue('');
    }
  }, [editingVarName, editValue, setSelectedVariable]);

  // Keyboard Handler für Inline-Edit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingVarName(null);
      setEditValue('');
    }
  }, [handleSaveEdit]);

  // Tooltip-Text basierend auf Typ
  const getTooltip = (segment: typeof segments[0]) => {
    if (segment.varType === 'system') {
      return `⚡ System: ${segment.variableName} → ${segment.value}`;
    }
    if (segment.varType === 'computed') {
      return segment.isFilled
        ? `🔢 Berechnung: ${segment.variableName} = ${segment.value}`
        : `🔢 Berechnung: ${segment.variableName} (Werte fehlen)`;
    }
    return segment.isFilled
      ? `${segment.variableName}: ${segment.value}`
      : `Variable: ${segment.variableName} (nicht ausgefüllt)`;
  };

  // Render
  const content = segments.map((segment, index) => {
    if (segment.type === 'text') {
      return <span key={index}>{segment.content}</span>;
    }

    // Im Preview/PDF-Modus: Einfacher Text ohne Styling
    if (isPreview) {
      return (
        <span key={index}>
          {segment.isFilled ? segment.value : segment.content}
        </span>
      );
    }

    const isCurrentlyEditing = editingVarName === segment.variableName;

    // Inline-Editing Input
    if (isCurrentlyEditing) {
      return (
        <input
          key={index}
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className={styles.inlineEdit}
          placeholder={toReadableLabel(segment.variableName || '')}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    // CSS-Klasse basierend auf Typ und Status (nur im Edit-Modus)
    const varClass = [
      styles.variable,
      segment.isFilled ? styles.filled : styles.empty,
      segment.varType === 'system' ? styles.system : '',
      segment.varType === 'computed' ? styles.computed : '',
    ].filter(Boolean).join(' ');

    // Anzeige: Wenn Wert vorhanden → Wert, sonst lesbare Label
    const displayText = segment.isFilled
      ? segment.value
      : toReadableLabel(segment.variableName || '');

    return (
      <span
        key={index}
        className={varClass}
        onMouseDown={(e) => {
          // MouseDown feuert VOR blur - so können wir den pending Klick setzen
          if (segment.varType === 'system' || segment.varType === 'computed') return;
          e.stopPropagation();
          e.preventDefault();

          // Wert aus Store holen (nicht aus segment, da das veraltet sein kann)
          const storeVar = variables.find((v: Variable) => {
            const cleanName = v.name.replace(/^\{\{|\}\}$/g, '');
            return cleanName === segment.variableName || v.name === `{{${segment.variableName}}}`;
          });
          const currentVal = storeVar?.value ? String(storeVar.value) : '';

          // Wenn gerade editiert wird, setze pending für nahtlosen Wechsel
          if (editingVarName && editingVarName !== segment.variableName) {
            pendingClickRef.current = { varName: segment.variableName!, value: currentVal };
            // Blur wird automatisch getriggert und handleSaveEdit übernimmt
            inputRef.current?.blur();
          } else if (!editingVarName) {
            // Keine aktive Bearbeitung - direkt öffnen
            handleVariableClick(segment.variableName!, segment.varType, segment.value);
          }
        }}
        title={getTooltip(segment)}
        data-variable-name={segment.variableName}
        style={{
          cursor: segment.varType === 'system' || segment.varType === 'computed' ? 'default' : 'pointer'
        }}
      >
        {displayText}
      </span>
    );
  });

  // Wrapper mit onDoubleClick für Inline-Editing
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (onDoubleClick && !isPreview) {
      e.stopPropagation();
      onDoubleClick();
    }
  };

  if (multiline) {
    const multilineClasses = [
      styles.multiline,
      onDoubleClick && !isPreview ? styles.editable : ''
    ].filter(Boolean).join(' ');

    return (
      <div
        className={multilineClasses}
        onDoubleClick={handleDoubleClick}
        title={onDoubleClick && !isPreview ? 'Doppelklick zum Bearbeiten' : undefined}
      >
        {content}
      </div>
    );
  }

  const inlineClasses = [
    styles.inline,
    onDoubleClick && !isPreview ? styles.editable : ''
  ].filter(Boolean).join(' ');

  return (
    <span
      className={inlineClasses}
      onDoubleClick={handleDoubleClick}
      title={onDoubleClick && !isPreview ? 'Doppelklick zum Bearbeiten' : undefined}
    >
      {content}
    </span>
  );
};

export default VariableHighlight;
