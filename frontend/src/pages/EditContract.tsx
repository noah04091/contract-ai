import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import styles from "./EditContract.module.css";

interface Contract {
  name: string;
  laufzeit: string;
  kuendigung: string;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  return (
    <motion.div
      className={`${styles.toast} ${type === 'success' ? styles.success : styles.error}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <span className={styles.toastIcon}>{type === 'success' ? '✅' : '❌'}</span>
      <span className={styles.toastMessage}>{message}</span>
    </motion.div>
  );
};

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => {
  return (
    <motion.div
      className={styles.inputGroup}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.inputField}
      />
    </motion.div>
  );
};

export default function EditContract() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<Contract>({
    name: "",
    laufzeit: "",
    kuendigung: "",
  });

  const [message, setMessage] = useState("");
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/contracts/${id}`, {
          credentials: "include",
        });

        if (!res.ok) {
          setMessage("Vertrag nicht gefunden");
          setToastType('error');
          return;
        }

        const data = await res.json();
        setContract({
          name: data.name || "",
          laufzeit: data.laufzeit || "",
          kuendigung: data.kuendigung || "",
        });
      } catch (err) {
        console.error("Fehler beim Abrufen:", err);
        setMessage("Serverfehler beim Abrufen");
        setToastType('error');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchContract();
  }, [id]);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contract),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Vertrag erfolgreich aktualisiert");
        setToastType('success');
        setTimeout(() => navigate("/contracts"), 1500);
      } else {
        setMessage("Fehler: " + (data.message || "Unbekannter Fehler"));
        setToastType('error');
      }
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      setMessage("Serverfehler beim Speichern");
      setToastType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/contracts");
  };

  return (
    <>
      <Helmet>
        <title>Vertrag bearbeiten | Contract AI</title>
        <meta name="description" content="Bearbeite deine Verträge direkt online. Ändere Daten, optimiere Inhalte und aktualisiere Vertragsdetails in wenigen Klicks mit Contract AI." />
        <meta name="keywords" content="Vertrag bearbeiten, Vertragseditor, Vertrag ändern, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/edit-contract" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Vertrag bearbeiten | Contract AI" />
        <meta property="og:description" content="Aktualisiere deine Vertragsdaten online einfach und sicher mit dem Contract AI Editor." />
        <meta property="og:url" content="https://www.contract-ai.de/edit-contract" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertrag bearbeiten | Contract AI" />
        <meta name="twitter:description" content="Bearbeite deine Verträge in wenigen Schritten online mit Contract AI." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <motion.div
        className={styles.editContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.headerContainer}>
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={styles.editTitle}
          >
            <span className={styles.titleIcon}>✏️</span> Vertrag bearbeiten
          </motion.h1>

          <motion.div
            className={styles.headerBlur}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <motion.div
          className={styles.editForm}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Vertrag wird geladen...</p>
            </div>
          ) : (
            <>
              <InputField
                label="Name"
                value={contract.name}
                onChange={(value) => setContract({ ...contract, name: value })}
                placeholder="Vertragsname eingeben"
              />

              <InputField
                label="Laufzeit"
                value={contract.laufzeit}
                onChange={(value) => setContract({ ...contract, laufzeit: value })}
                placeholder="z.B. 12 Monate"
              />

              <InputField
                label="Kündigungsfrist"
                value={contract.kuendigung}
                onChange={(value) => setContract({ ...contract, kuendigung: value })}
                placeholder="z.B. 3 Monate vor Ablauf"
              />

              <div className={styles.buttonGroup}>
                <motion.button
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Abbrechen
                </motion.button>

                <motion.button
                  className={styles.saveButton}
                  onClick={handleUpdate}
                  disabled={isSaving}
                  whileHover={{ scale: 1.02, boxShadow: "0 4px 8px rgba(0, 0, 0, 0.12)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {isSaving ? (
                    <>
                      <span className={styles.buttonSpinner}></span>
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.saveIcon}>💾</span>
                      <span>Speichern</span>
                    </>
                  )}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>

        <AnimatePresence>
          {message && (
            <Toast message={message} type={toastType} />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}