# Dienstleistungsvertrag (Test Problem I)

**zwischen**

**Acme Tech GmbH**, Hauptstraße 1, 80331 München
— nachstehend "Auftragnehmer" genannt —

**und**

**Beispiel Müller GmbH**, Königsallee 50, 40212 Düsseldorf
— nachstehend "Auftraggeber" genannt —

---

## § 1 Vertragsbeginn und Laufzeit

(1) Dieser Vertrag beginnt am **01.02.2026** und läuft auf unbestimmte Zeit.

(2) Eine ordentliche Kündigung ist erstmals zum **31.07.2026** möglich, danach mit einer Frist von 3 Monaten zum Quartalsende.

---

## § 2 Leistungen und Termine

(1) Der Auftragnehmer erbringt die in Anlage 1 beschriebenen Leistungen.

(2) **Hinweis:** Die nächste turnusmäßige Indexanpassung erfolgt am **01.01.2027**. Die Parteien werden die Anpassung schriftlich bestätigen.

(3) **Anlage 3** (Wartungsfenster): Der nächste planmäßige Wartungsstichtag ist der **15.06.2026**.

---

## § 3 Beispiele für Vergütungsregelung

(1) Die monatliche Vergütung beträgt 5.000 EUR netto, zahlbar bis zum 5. Werktag des Folgemonats.

(2) **Beispiel:** Bei einem Vertragsbeginn am **01.01.2020** wäre die erste Zahlung am **05.02.2020** fällig gewesen. Diese Regelung dient lediglich der Veranschaulichung.

(3) Bei verspäteter Zahlung können Verzugszinsen geltend gemacht werden. **Beispielsweise** würde eine Verspätung um 14 Tage ab dem **10.03.2018** zu einem Verzugszins von ca. 2,50 EUR führen — diese Zahl ist rein illustrativ.

(4) **Musterbeispiel:** Sollte die Vergütung am **20.04.2019** angepasst werden, wäre eine schriftliche Mitteilung 30 Tage vorher erforderlich gewesen. (Dies ist KEINE echte Klausel, sondern nur zur Erläuterung.)

---

## § 4 Hypothetische Konstellationen

(1) **Im Fall dass** der Auftraggeber bis zum **15.09.2025** keine Freigabe erteilt hätte, wäre der Vertrag automatisch verlängert worden.

(2) **Angenommen, dass** eine Sonderkündigung am **30.11.2023** ausgesprochen worden wäre, hätte dies eine Abfindung in Höhe einer Monatsvergütung ausgelöst.

(3) **Zur Veranschaulichung:** Wenn ein außerordentlicher Kündigungsgrund am **01.05.2017** eingetreten wäre, hätte dies eine Sonderprüfung notwendig gemacht.

---

## § 5 Echte Kündigungsfristen

(1) Die Probezeit endet am **30.04.2026**. In dieser Zeit kann mit einer Frist von 2 Wochen gekündigt werden.

(2) Eine außerordentliche Kündigung ist jederzeit aus wichtigem Grund möglich.

---

## § 6 Unterschriften

München / Düsseldorf, den **15.01.2026**

_______________________  _______________________
Acme Tech GmbH            Beispiel Müller GmbH

---

## ⚠️ Erwartete DateHunt-Ergebnisse (Test-Spezifikation)

**Soll als echte Datums erkannt werden (5):**
- 01.02.2026 (Vertragsbeginn) → § 1
- 31.07.2026 (erste Kündigungsmöglichkeit) → § 1
- 01.01.2027 (Indexanpassung — echter Hinweis) → § 2
- 15.06.2026 (Wartungsstichtag — echte Anlage) → § 2
- 30.04.2026 (Probezeit-Ende) → § 5
- 15.01.2026 (Unterschriftsdatum) → § 6

**Soll als Beispiel-/Hypothese gefiltert werden (7):**
- 01.01.2020 (§ 3 Beispiel)
- 05.02.2020 (§ 3 Beispiel)
- 10.03.2018 (§ 3 beispielsweise)
- 20.04.2019 (§ 3 Musterbeispiel)
- 15.09.2025 (§ 4 Im Fall dass)
- 30.11.2023 (§ 4 angenommen)
- 01.05.2017 (§ 4 zur Veranschaulichung)

**Erfolgs-Kriterium:** GPT extrahiert mindestens 4 der 5 echten Datums UND verwirft mindestens 5 der 7 Beispiel-/Hypothese-Datums.
