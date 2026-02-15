// 📝 PlaceSignatureFields.tsx - Feld-Platzierung für bestehende Envelopes
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader, ExternalLink, HelpCircle, X } from 'lucide-react';
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
  const [showHelp, setShowHelp] = useState(false);

  // Signer Colors (optimized for maximum contrast between first 2 colors)
  const SIGNER_COLORS = [
    '#2E6CF6', // Blue
    '#F59E0B', // Orange (strong contrast to Blue!)
    '#10B981', // Green
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
        console.log('📋 Signers in envelope:', envelopeData.envelope.signers.map((s: { email: string; name: string }) => `${s.name} <${s.email}>`));

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

  // Convert envelope signers to editor format with colors (normalize emails)
  const editorSigners: Signer[] = envelope
    ? envelope.signers.map((signer, index) => ({
        email: signer.email.toLowerCase().trim(),
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

    // Validation: Check if all signers have at least one signature field (case-insensitive)
    const signersWithFields = new Set(fields.map(f => f.assigneeEmail.toLowerCase().trim()));
    const signersWithoutFields = envelope.signers.filter(s => !signersWithFields.has(s.email.toLowerCase().trim()));

    if (signersWithoutFields.length > 0) {
      const missing = signersWithoutFields.map(s => `- ${s.name} (${s.email})`).join('\n');
      alert(`⚠️ Folgende Unterzeichner haben keine Signaturfelder:\n\n${missing}\n\nBitte platzieren Sie für jeden Unterzeichner mindestens ein Signaturfeld.`);
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      // 1. Update envelope with fields (normalize emails before sending)
      const normalizedFields = fields.map(field => ({
        ...field,
        assigneeEmail: field.assigneeEmail.toLowerCase().trim()
      }));

      console.log(`📤 Updating envelope with ${normalizedFields.length} fields...`);
      console.log('📊 Field data being sent:', JSON.stringify(normalizedFields, null, 2));

      const updateRes = await fetch(`/api/envelopes/${envelopeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          signatureFields: normalizedFields
        })
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData.error || 'Fehler beim Speichern der Felder');
      }

      console.log('✅ Fields saved successfully');

      // 2. Send invitations
      console.log('📧 Sending invitations...');

      // Generate idempotency key to prevent duplicate emails on retries
      const idempotencyKey = `send-${envelopeId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const sendRes = await fetch(`/api/envelopes/${envelopeId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
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

      // Navigate back to envelopes dashboard
      navigate('/envelopes');
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
            onClick={() => navigate('/envelopes')}
          >
            <ArrowLeft size={16} />
            Zurück zu Signaturen
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
          onClick={() => navigate('/envelopes')}
          title="Zurück zu Signaturen"
        >
          <ArrowLeft size={18} />
          <span>Zurück</span>
        </button>

        <button
          className={styles.iconButton}
          onClick={() => window.open(pdfUrl, '_blank')}
          title="PDF in neuem Fenster öffnen"
        >
          <ExternalLink size={18} />
        </button>

        <button
          className={styles.iconButton}
          onClick={() => setShowHelp(true)}
          title="Anleitung"
        >
          <HelpCircle size={18} />
        </button>

        <button
          className={styles.sendButton}
          onClick={handleSaveAndSend}
          disabled={saving || fields.length === 0}
          title="Speichern & Absenden"
        >
          <Send size={18} />
          <span>Speichern & Absenden</span>
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

      {/* Help Modal */}
      {showHelp && (
        <div className={styles.helpOverlay} onClick={() => setShowHelp(false)}>
          <div className={styles.helpModal} onClick={e => e.stopPropagation()}>
            <div className={styles.helpHeader}>
              <h3>Anleitung</h3>
              <button
                className={styles.helpCloseBtn}
                onClick={() => setShowHelp(false)}
              >
                <X size={20} />
              </button>
            </div>
            <ul className={styles.helpList}>
              <li>Wählen Sie einen Feldtyp (Signatur, Datum, Text) und einen Unterzeichner aus</li>
              <li>Tippen Sie auf "Feld hinzufügen" um ein Feld zu platzieren</li>
              <li>Ziehen Sie Felder an die gewünschte Position</li>
              <li>Jeder Unterzeichner braucht mindestens ein Signaturfeld</li>
              <li>Tippen Sie auf "Speichern & Absenden" zum Versenden</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
