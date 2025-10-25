# 📧 Email Parser Lambda Function

AWS Lambda-Funktion für automatischen E-Mail-Import von Verträgen via SES.

## 🚀 Deployment

### 1. Dependencies installieren

```bash
cd aws-lambda/email-parser
npm install
```

### 2. ZIP-Paket erstellen

```bash
# Windows (PowerShell)
Compress-Archive -Path index.js,node_modules,package.json -DestinationPath function.zip -Force

# macOS/Linux
zip -r function.zip index.js node_modules package.json
```

### 3. Lambda-Funktion erstellen (AWS CLI)

```bash
aws lambda create-function \
  --function-name contract-ai-email-parser \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-ses-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{API_ENDPOINT=https://api.contract-ai.de,S3_EMAIL_BUCKET=contract-ai-email-inbox,EMAIL_IMPORT_API_KEY=YOUR_SECRET_KEY}" \
  --dead-letter-config TargetArn=arn:aws:sqs:eu-west-1:YOUR_ACCOUNT_ID:email-parser-dlq
```

### 4. Update (nach Code-Änderungen)

```bash
# ZIP neu erstellen
Compress-Archive -Path index.js,node_modules,package.json -DestinationPath function.zip -Force

# Lambda updaten
aws lambda update-function-code \
  --function-name contract-ai-email-parser \
  --zip-file fileb://function.zip
```

## ⚙️ Erforderliche IAM-Permissions

Die Lambda-Execution-Role benötigt:

```json
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
      "Resource": "arn:aws:sqs:eu-west-1:*:email-parser-dlq"
    }
  ]
}
```

## 📊 Monitoring

### CloudWatch Logs

```bash
aws logs tail /aws/lambda/contract-ai-email-parser --follow
```

### CloudWatch Insights Query

```
fields @timestamp, @message
| filter @message like /❌/
| sort @timestamp desc
| limit 20
```

## 🧪 Testen

### Test-Event (SES→SNS→Lambda)

```json
{
  "Records": [
    {
      "EventSource": "aws:sns",
      "Sns": {
        "Message": "{\"mail\":{\"messageId\":\"test-123\",\"destination\":[\"u_673b2e4f8c9d1a2b3c4d5e6f.abc123def456@upload.contract-ai.de\"]},\"receipt\":{}}"
      }
    }
  ]
}
```

## 🔧 Troubleshooting

**Fehler: "EMAIL_IMPORT_API_KEY erforderlich"**
→ Environment Variable nicht gesetzt. Checke Lambda-Config.

**Fehler: "Access Denied" bei S3**
→ IAM-Role fehlt s3:GetObject Permission.

**Backend antwortet mit 401**
→ API-Key stimmt nicht mit Backend .env überein.
