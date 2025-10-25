# 📧 AWS Setup: E-Mail-Import Feature

Komplette Anleitung zum Einrichten von AWS SES + Lambda + DLQ + Monitoring für automatischen Contract-Import per E-Mail.

---

## ✅ Voraussetzungen

- ✅ AWS-Account mit Admin-Rechten
- ✅ Domain `contract-ai.de` besitzt (für Subdomain `upload.contract-ai.de`)
- ✅ AWS CLI installiert und konfiguriert
- ✅ Backend läuft und ist über `https://api.contract-ai.de` erreichbar

---

## 📋 Checkliste

Nutze diese Checkliste, um sicherzustellen, dass alles korrekt konfiguriert ist:

- [ ] SES Region ist `eu-west-1` (oder andere supported region)
- [ ] Domain `upload.contract-ai.de` in SES verifiziert
- [ ] MX + SPF + DKIM + DMARC DNS-Records gesetzt
- [ ] SES aus Sandbox raus (Production Mode)
- [ ] S3-Bucket `contract-ai-email-inbox` erstellt mit SSE-S3
- [ ] DLQ (SQS) erstellt: `email-parser-dlq`
- [ ] Lambda IAM-Role mit Permissions erstellt
- [ ] Lambda-Funktion deployed
- [ ] Lambda Environment Variables gesetzt
- [ ] SES Receipt Rule erstellt (S3 + Lambda Trigger)
- [ ] CloudWatch Alarms konfiguriert
- [ ] Backend .env mit `EMAIL_IMPORT_API_KEY` gesetzt
- [ ] End-to-End Test durchgeführt

---

## 🌍 Schritt 1: Region wählen

**WICHTIG:** AWS SES E-Mail-Empfang ist nur in bestimmten Regionen verfügbar!

Unterstützte Regionen (Stand 2025):
- ✅ `eu-west-1` (Irland) → **Empfohlen für Europa**
- ✅ `us-east-1` (N. Virginia)
- ✅ `us-west-2` (Oregon)

```bash
# Region setzen (für alle folgenden Befehle)
export AWS_REGION=eu-west-1
aws configure set region eu-west-1
```

---

## 📧 Schritt 2: Domain in SES verifizieren

### 2.1 Domain Identity erstellen

```bash
aws sesv2 create-email-identity \
  --email-identity upload.contract-ai.de \
  --region eu-west-1
```

### 2.2 DNS-Records abrufen

```bash
aws sesv2 get-email-identity \
  --email-identity upload.contract-ai.de \
  --region eu-west-1
```

**Output enthält:**
- DKIM-Records (3x CNAME)
- SPF-Record (TXT)
- DMARC-Record (TXT)
- MX-Record (für E-Mail-Empfang)

### 2.3 DNS-Records in deinem DNS-Provider eintragen

**Bei CloudFlare, Namecheap, etc.:**

```
Type: MX
Host: upload.contract-ai.de
Value: 10 inbound-smtp.eu-west-1.amazonaws.com
Priority: 10

Type: TXT
Host: upload.contract-ai.de
Value: v=spf1 include:amazonses.com ~all

Type: TXT
Host: _dmarc.upload.contract-ai.de
Value: v=DMARC1;p=quarantine;pct=100;rua=mailto:postmaster@contract-ai.de

Type: CNAME (3x für DKIM)
Host: abc123._domainkey.upload.contract-ai.de
Value: abc123.dkim.amazonses.com
(wiederhole für alle 3 DKIM-Keys)
```

### 2.4 Verifizierung prüfen

```bash
# Warte 5-10 Minuten, dann prüfen:
aws sesv2 get-email-identity \
  --email-identity upload.contract-ai.de \
  --region eu-west-1 \
  --query "DkimAttributes.Status"

# Output sollte sein: "SUCCESS"
```

---

## 🚀 Schritt 3: SES aus Sandbox nehmen

**Standardmäßig ist SES im "Sandbox Mode"** → E-Mails nur von verifizierten Absendern.

**Für Production: Sandbox deaktivieren**

1. AWS Console → SES → Account Dashboard
2. Klicke **"Request production access"**
3. Fülle Formular aus:
   - Mail Type: **Transactional**
   - Use Case: **Contract document import via email forwarding**
   - Expected Volume: **500 emails/day**
4. Warte auf Freigabe (1-24 Stunden)

---

## 📦 Schritt 4: S3-Bucket für E-Mail-Speicherung

### 4.1 Bucket erstellen

```bash
aws s3 mb s3://contract-ai-email-inbox --region eu-west-1
```

### 4.2 Server-Side Encryption aktivieren

```bash
aws s3api put-bucket-encryption \
  --bucket contract-ai-email-inbox \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

### 4.3 Lifecycle-Rule: Auto-Delete nach 30 Tagen

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket contract-ai-email-inbox \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "delete-emails-after-30-days",
      "Status": "Enabled",
      "Filter": {"Prefix": "emails/"},
      "Expiration": {"Days": 30}
    }]
  }'
```

### 4.4 Bucket Policy für SES

```bash
# Erstelle Datei: ses-bucket-policy.json
cat > ses-bucket-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowSESPuts",
    "Effect": "Allow",
    "Principal": {"Service": "ses.amazonaws.com"},
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::contract-ai-email-inbox/*",
    "Condition": {
      "StringEquals": {"AWS:SourceAccount": "YOUR_AWS_ACCOUNT_ID"}
    }
  }]
}
EOF

# Account-ID eintragen (ersetze YOUR_AWS_ACCOUNT_ID)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i "s/YOUR_AWS_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" ses-bucket-policy.json

# Policy anwenden
aws s3api put-bucket-policy \
  --bucket contract-ai-email-inbox \
  --policy file://ses-bucket-policy.json
```

---

## 🔔 Schritt 5: Dead Letter Queue (DLQ) erstellen

```bash
# SQS-Queue für fehlgeschlagene Lambda-Executions
aws sqs create-queue \
  --queue-name email-parser-dlq \
  --region eu-west-1

# ARN speichern für später
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/$AWS_ACCOUNT_ID/email-parser-dlq \
  --attribute-names QueueArn \
  --query "Attributes.QueueArn" \
  --output text \
  --region eu-west-1)

echo "DLQ ARN: $DLQ_ARN"
```

---

## 🔐 Schritt 6: IAM-Role für Lambda erstellen

### 6.1 Trust Policy

```bash
cat > lambda-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name lambda-ses-email-parser-role \
  --assume-role-policy-document file://lambda-trust-policy.json
```

### 6.2 Permissions Policy

```bash
cat > lambda-permissions-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::contract-ai-email-inbox/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage"
      ],
      "Resource": "DLQ_ARN_PLACEHOLDER"
    }
  ]
}
EOF

# DLQ ARN einfügen
sed -i "s|DLQ_ARN_PLACEHOLDER|$DLQ_ARN|g" lambda-permissions-policy.json

# Policy erstellen
aws iam put-role-policy \
  --role-name lambda-ses-email-parser-role \
  --policy-name lambda-ses-email-parser-permissions \
  --policy-document file://lambda-permissions-policy.json
```

---

## ⚡ Schritt 7: Lambda-Funktion deployen

### 7.1 Dependencies installieren & ZIP erstellen

```bash
cd aws-lambda/email-parser
npm install

# ZIP erstellen (Windows PowerShell)
Compress-Archive -Path index.js,node_modules,package.json -DestinationPath function.zip -Force

# ODER (macOS/Linux)
zip -r function.zip index.js node_modules package.json
```

### 7.2 API-Key generieren

```bash
# Sicheren API-Key generieren
EMAIL_IMPORT_API_KEY=$(openssl rand -hex 32)
echo "🔐 API-Key (SPEICHERN!): $EMAIL_IMPORT_API_KEY"

# Diesen Key in Backend .env eintragen:
# EMAIL_IMPORT_API_KEY=der_generierte_key
```

### 7.3 Lambda-Funktion erstellen

```bash
ROLE_ARN=$(aws iam get-role --role-name lambda-ses-email-parser-role --query "Role.Arn" --output text)

aws lambda create-function \
  --function-name contract-ai-email-parser \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --dead-letter-config TargetArn=$DLQ_ARN \
  --environment Variables="{
    API_ENDPOINT=https://api.contract-ai.de,
    S3_EMAIL_BUCKET=contract-ai-email-inbox,
    EMAIL_IMPORT_API_KEY=$EMAIL_IMPORT_API_KEY
  }" \
  --region eu-west-1
```

### 7.4 SES Permission für Lambda

```bash
aws lambda add-permission \
  --function-name contract-ai-email-parser \
  --statement-id AllowSESInvoke \
  --action lambda:InvokeFunction \
  --principal ses.amazonaws.com \
  --source-account $AWS_ACCOUNT_ID \
  --region eu-west-1
```

---

## 📬 Schritt 8: SES Receipt Rule erstellen

### 8.1 Rule Set erstellen (falls nicht vorhanden)

```bash
aws ses create-receipt-rule-set \
  --rule-set-name contract-ai-email-rules \
  --region eu-west-1

aws ses set-active-receipt-rule-set \
  --rule-set-name contract-ai-email-rules \
  --region eu-west-1
```

### 8.2 Receipt Rule erstellen

```bash
LAMBDA_ARN=$(aws lambda get-function \
  --function-name contract-ai-email-parser \
  --query "Configuration.FunctionArn" \
  --output text \
  --region eu-west-1)

cat > ses-receipt-rule.json <<EOF
{
  "Name": "email-to-contract-import",
  "Enabled": true,
  "Recipients": ["upload.contract-ai.de"],
  "Actions": [
    {
      "S3Action": {
        "BucketName": "contract-ai-email-inbox",
        "ObjectKeyPrefix": "emails/"
      }
    },
    {
      "LambdaAction": {
        "FunctionArn": "$LAMBDA_ARN",
        "InvocationType": "Event"
      }
    }
  ],
  "ScanEnabled": true
}
EOF

aws ses create-receipt-rule \
  --rule-set-name contract-ai-email-rules \
  --rule file://ses-receipt-rule.json \
  --region eu-west-1
```

---

## 📊 Schritt 9: CloudWatch Alarms einrichten

### 9.1 Alarm: Lambda-Fehler

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name email-parser-lambda-errors \
  --alarm-description "Alert when Lambda function has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=contract-ai-email-parser \
  --region eu-west-1
```

### 9.2 Alarm: DLQ Messages

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name email-parser-dlq-messages \
  --alarm-description "Alert when messages in DLQ" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=QueueName,Value=email-parser-dlq \
  --region eu-west-1
```

---

## 🧪 Schritt 10: End-to-End Test

### 10.1 Test-User E-Mail-Adresse abrufen

1. Gehe zu https://contract-ai.de/contracts
2. Logge dich ein
3. Du solltest das E-Mail-Widget sehen mit deiner Adresse

### 10.2 Test-E-Mail senden

1. Öffne dein privates E-Mail-Postfach
2. Erstelle neue E-Mail:
   - **An:** `deine_user_adresse@upload.contract-ai.de`
   - **Betreff:** Test Contract Import
   - **Anhang:** Ein PDF (< 15 MB)
3. Sende ab

### 10.3 Logs prüfen

```bash
# Lambda Logs (live tail)
aws logs tail /aws/lambda/contract-ai-email-parser --follow --region eu-west-1

# Nach spezifischen Errors suchen
aws logs filter-log-events \
  --log-group-name /aws/lambda/contract-ai-email-parser \
  --filter-pattern "ERROR" \
  --region eu-west-1
```

### 10.4 Contract in DB prüfen

```bash
# Via Backend-Logs oder direkt in MongoDB:
# Sollte neuen Contract mit uploadType: 'EMAIL_IMPORT' geben
```

---

## 🔧 Troubleshooting

### Problem: "E-Mail kommt nicht an"

```bash
# 1. DNS-Records prüfen
dig MX upload.contract-ai.de
dig TXT upload.contract-ai.de

# 2. SES Receipt Rule prüfen
aws ses describe-active-receipt-rule-set --region eu-west-1

# 3. S3-Bucket prüfen (sollte E-Mail enthalten)
aws s3 ls s3://contract-ai-email-inbox/emails/
```

### Problem: "Lambda-Fehler: Access Denied"

→ IAM-Role fehlt s3:GetObject Permission. Checke Step 6.2.

### Problem: "Backend antwortet mit 401"

→ API-Key stimmt nicht. Vergleiche:
- Lambda Environment Variable: `EMAIL_IMPORT_API_KEY`
- Backend .env: `EMAIL_IMPORT_API_KEY`

Müssen **identisch** sein!

---

## 🎯 Fertig!

✅ Du hast erfolgreich eingerichtet:
- AWS SES E-Mail-Empfang
- Lambda-Parsing mit DLQ
- Backend-Integration
- Monitoring & Alarms

**Teste jetzt das Feature live!** 🎉
