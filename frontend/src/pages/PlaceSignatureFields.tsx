// 📝 PlaceSignatureFields.tsx - Feld-Platzierung für bestehende Envelopes
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader } from 'lucide-react';
import PDFFieldPlacementEditor, { SignatureField, Signer } from '../components/PDFFieldPlacementEditor';
import styles from '../styles/PlaceSignatureFields.module.css';

interface Envelope {
  _id: string;
  title: string;
  s3Key: string;
  signers: Array<{
    email: string;
    name: string;
    role: string;
    order: number;
  }>;
  signatureFields: SignatureField[];
  status: string;
}

export default function PlaceSignatureFields() {
  const { envelopeId } = useParams<{ envelopeId: string }>();
  const navigate = useNavigate();

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signer Colors (same as in Generate.tsx)
  const SIGNER_COLORS = [
    '#2E6CF6', // Blue
    '#10B981', // Green
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
  ];

  // Load envelope data and PDF
  useEffect(() => {
    const loadEnvelope = async () => {
      if (!envelopeId) {
        setError('Keine Envelope ID angegeben');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');

        // 1. Load envelope data
        const envelopeRes = await fetch(`/api/envelopes/${envelopeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!envelopeRes.ok) {
          throw new Error('Envelope nicht gefunden');
        }

        const envelopeData = await envelopeRes.json();
        console.log('✅ Envelope loaded:', envelopeData);

        setEnvelope(envelopeData.envelope);
        setFields(envelopeData.envelope.signatureFields || []);

        // 2. Get presigned PDF URL
        const pdfRes = await fetch(`/api/s3/view?key=${encodeURIComponent(envelopeData.envelope.s3Key)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!pdfRes.ok) {
          throw new Error('PDF URL konnte nicht geladen werden');
        }

        const pdfData = await pdfRes.json();
        console.log('✅ PDF URL loaded:', pdfData.url || pdfData.fileUrl);

        setPdfUrl(pdfData.url || pdfData.fileUrl);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading envelope:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        setLoading(false);
      }
    };

    loadEnvelope();
  }, [envelopeId]);

  // Convert envelope signers to editor format with colors
  const editorSigners: Signer[] = envelope
    ? envelope.signers.map((signer, index) => ({
        email: signer.email,
        name: signer.name,
        color: SIGNER_COLORS[index % SIGNER_COLORS.length]
      }))
    : [];

  // Handle fields change
  const handleFieldsChange = useCallback((newFields: SignatureField[]) => {
    setFields(newFields);
  }, []);

  // Save fields and send invitations
  const handleSaveAndSend = async () => {
    if (!envelope || !envelopeId) return;

    // Validation: Check if all signers have at least one signature field
    const signersWithFields = new Set(fields.map(f => f.assigneeEmail));
    const signersWithoutFields = envelope.signers.filter(s => !signersWithFields.has(s.email));

    if (signersWithoutFields.length > 0) {
      const missing = signersWithoutFields.map(s => `- ${s.name} (${s.email})`).join('\n');
      alert(`⚠️ Folgende Unterzeichner haben keine Signaturfelder:\n\n${missing}\n\nBitte platzieren Sie für jeden Unterzeichner mindestens ein Signaturfeld.`);
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      // 1. Update envelope with fields
      console.log(`📤 Updating envelope with ${fields.length} fields...`);

      const updateRes = await fetch(`/api/envelopes/${envelopeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          signatureFields: fields
        })
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData.error || 'Fehler beim Speichern der Felder');
      }

      console.log('✅ Fields saved successfully');

      // 2. Send invitations
      console.log('📧 Sending invitations...');

      const sendRes = await fetch(`/api/envelopes/${envelopeId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const sendData = await sendRes.json();

      if (!sendRes.ok) {
        console.warn('⚠️ Fields saved, but sending failed:', sendData.error);
        alert(`✅ Felder wurden gespeichert.\n\n⚠️ E-Mail-Versand fehlgeschlagen:\n${sendData.error}\n\nSie können die Einladungen später über das Envelopes Dashboard versenden.`);
      } else {
        console.log('✅ Invitations sent successfully');
        alert(`✅ Signaturanfrage erfolgreich versendet!\n\nE-Mail-Einladungen wurden gesendet an:\n${envelope.signers.map(s => `- ${s.name} (${s.email})`).join('\n')}`);
      }

      // Navigate back to contracts or envelopes dashboard
      navigate('/contracts');
    } catch (err) {
      console.error('❌ Error saving fields:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      alert(`❌ Fehler beim Speichern:\n\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader className={styles.spinner} size={48} />
          <p>Lade Envelope und PDF...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !envelope) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>❌ Fehler</h2>
          <p>{error || 'Envelope nicht gefunden'}</p>
          <button
            className={styles.backButton}
            onClick={() => navigate('/contracts')}
          >
            <ArrowLeft size={16} />
            Zurück zu Verträgen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/contracts')}
        >
          <ArrowLeft size={16} />
          Zurück
        </button>

        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Signaturfelder platzieren</h1>
          <p className={styles.subtitle}>{envelope.title}</p>
        </div>

        <button
          className={styles.sendButton}
          onClick={handleSaveAndSend}
          disabled={saving || fields.length === 0}
        >
          {saving ? (
            <>
              <Loader size={16} className={styles.spinner} />
              Wird gesendet...
            </>
          ) : (
            <>
              <Send size={16} />
              Speichern & Absenden
            </>
          )}
        </button>
      </div>

      {/* Editor */}
      <div className={styles.editorWrapper}>
        <PDFFieldPlacementEditor
          pdfUrl={pdfUrl}
          signers={editorSigners}
          fields={fields}
          onFieldsChange={handleFieldsChange}
        />
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <h3>📋 Anleitung</h3>
        <ul>
          <li>Wählen Sie einen Feldtyp (Signatur, Datum, Text) und einen Unterzeichner aus der Toolbar</li>
          <li>Klicken Sie auf "Feld hinzufügen" oder klicken Sie direkt auf das PDF, um ein Feld zu platzieren</li>
          <li>Ziehen Sie Felder an die gewünschte Position</li>
          <li>Stellen Sie sicher, dass jeder Unterzeichner mindestens ein Signaturfeld hat</li>
          <li>Klicken Sie auf "Speichern & Absenden", um die Einladungen zu verschicken</li>
        </ul>
      </div>
    </div>
  );
}
