// 📁 backend/routes/cancellations.js
const express = require("express");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const nodemailer = require("nodemailer");
const { generateEmailTemplate } = require("../utils/emailTemplate");
const { logStatusChange } = require("../services/smartStatusUpdater"); // 🧠 NEU

const router = express.Router();

// POST /api/cancellations/send - Kündigung senden
router.post("/send", verifyToken, async (req, res) => {
  try {
    const {
      contractId,
      contractName,
      provider,
      cancellationLetter,
      sendMethod,
      recipientEmail,
      customerData,
      metadata
    } = req.body;
    
    const userId = new ObjectId(req.user.userId);
    
    // Create cancellation record
    const cancellationRecord = {
      userId,
      contractId: new ObjectId(contractId),
      contractName,
      provider,
      cancellationLetter,
      sendMethod,
      recipientEmail,
      customerData,
      metadata,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to database
    const result = await req.db.collection("cancellations").insertOne(cancellationRecord);
    const cancellationId = result.insertedId;
    
    // Send based on method
    if (sendMethod === "email" && recipientEmail) {
      try {
        // Send to provider
        await sendCancellationEmail(
          recipientEmail,
          contractName,
          provider,
          cancellationLetter,
          customerData
        );
        
        // Send copy to customer
        await sendCancellationCopy(
          customerData.email,
          contractName,
          provider,
          cancellationLetter,
          cancellationId
        );
        
        // Update status
        await req.db.collection("cancellations").updateOne(
          { _id: cancellationId },
          {
            $set: {
              status: "sent",
              sentAt: new Date()
            }
          }
        );

        // 🧠 Update contract status mit Smart Status Tracking
        const contract = await req.db.collection("contracts").findOne({ _id: new ObjectId(contractId) });
        const oldStatus = contract?.status || 'aktiv';

        await req.db.collection("contracts").updateOne(
          { _id: new ObjectId(contractId) },
          {
            $set: {
              status: "gekündigt", // 🎯 Lowercase für Konsistenz
              statusUpdatedAt: new Date(),
              cancellationId: cancellationId,
              cancellationDate: new Date(),
              updatedAt: new Date()
            }
          }
        );

        // 📊 Status-History speichern
        await logStatusChange(
          req.db.collection("contract_status_history"),
          new ObjectId(contractId),
          userId,
          oldStatus,
          "gekündigt",
          "cancellation",
          `Vertrag über Contract AI Portal gekündigt und E-Mail an ${provider || 'Anbieter'} versendet`
        );
        
        // Update related calendar events
        await req.db.collection("contract_events").updateMany(
          { 
            contractId: new ObjectId(contractId),
            status: { $in: ["scheduled", "notified"] }
          },
          { 
            $set: { 
              status: "completed",
              completedAt: new Date(),
              completionNote: "Vertrag wurde gekündigt"
            } 
          }
        );
        
        res.json({
          success: true,
          message: "Kündigung erfolgreich versendet",
          cancellationId: cancellationId,
          sentTo: recipientEmail
        });
        
      } catch (emailError) {
        console.error("❌ E-Mail-Versand fehlgeschlagen:", emailError);
        
        // Update status to failed
        await req.db.collection("cancellations").updateOne(
          { _id: cancellationId },
          { 
            $set: { 
              status: "failed",
              error: emailError.message
            } 
          }
        );
        
        throw new Error("E-Mail-Versand fehlgeschlagen: " + emailError.message);
      }
      
    } else {
      // Just save for download
      await req.db.collection("cancellations").updateOne(
        { _id: cancellationId },
        { $set: { status: "downloaded" } }
      );
      
      res.json({
        success: true,
        message: "Kündigung erfolgreich erstellt",
        cancellationId: cancellationId,
        downloadReady: true
      });
    }
    
  } catch (error) {
    console.error("❌ Error sending cancellation:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Fehler beim Senden der Kündigung" 
    });
  }
});

// GET /api/cancellations - Liste aller Kündigungen
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    
    const cancellations = await req.db.collection("cancellations")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      cancellations: cancellations.map(c => ({
        id: c._id,
        contractName: c.contractName,
        provider: c.provider,
        status: c.status,
        sendMethod: c.sendMethod,
        createdAt: c.createdAt,
        sentAt: c.sentAt
      }))
    });
    
  } catch (error) {
    console.error("❌ Error fetching cancellations:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Abrufen der Kündigungen" 
    });
  }
});

// GET /api/cancellations/:id - Einzelne Kündigung abrufen
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const cancellationId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.userId);
    
    const cancellation = await req.db.collection("cancellations").findOne({
      _id: cancellationId,
      userId: userId
    });
    
    if (!cancellation) {
      return res.status(404).json({ 
        success: false, 
        error: "Kündigung nicht gefunden" 
      });
    }
    
    res.json({
      success: true,
      cancellation
    });
    
  } catch (error) {
    console.error("❌ Error fetching cancellation:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Abrufen der Kündigung" 
    });
  }
});

// POST /api/cancellations/:id/resend - Kündigung erneut senden
router.post("/:id/resend", verifyToken, async (req, res) => {
  try {
    const cancellationId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.userId);
    const { recipientEmail } = req.body;
    
    const cancellation = await req.db.collection("cancellations").findOne({
      _id: cancellationId,
      userId: userId
    });
    
    if (!cancellation) {
      return res.status(404).json({ 
        success: false, 
        error: "Kündigung nicht gefunden" 
      });
    }
    
    // Resend email
    await sendCancellationEmail(
      recipientEmail || cancellation.recipientEmail,
      cancellation.contractName,
      cancellation.provider,
      cancellation.cancellationLetter,
      cancellation.customerData
    );
    
    // Update record
    await req.db.collection("cancellations").updateOne(
      { _id: cancellationId },
      { 
        $set: { 
          status: "resent",
          resentAt: new Date(),
          resentTo: recipientEmail || cancellation.recipientEmail
        } 
      }
    );
    
    res.json({
      success: true,
      message: "Kündigung erfolgreich erneut versendet"
    });
    
  } catch (error) {
    console.error("❌ Error resending cancellation:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim erneuten Versenden" 
    });
  }
});

// Helper: Send cancellation email to provider
async function sendCancellationEmail(recipientEmail, contractName, provider, letter, customerData) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
  const subject = `Kündigung: ${contractName}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
        .content { padding: 20px; }
        .footer { background: #f5f5f5; padding: 15px; margin-top: 30px; font-size: 12px; }
        pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Kündigung</h2>
      </div>
      <div class="content">
        <pre>${letter}</pre>
      </div>
      <div class="footer">
        <p>Diese E-Mail wurde elektronisch erstellt und ist ohne Unterschrift gültig.</p>
        <p>Absender: ${customerData.name} | ${customerData.email}</p>
      </div>
    </body>
    </html>
  `;
  
  await transporter.sendMail({
    from: `"${customerData.name}" <${process.env.EMAIL_USER}>`,
    replyTo: customerData.email,
    to: recipientEmail,
    subject: subject,
    text: letter,
    html: htmlContent
  });
}

// Helper: Send copy to customer
async function sendCancellationCopy(customerEmail, contractName, provider, letter, cancellationId) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
  const htmlContent = generateEmailTemplate({
    title: "Ihre Kündigung wurde versendet",
    preheader: `Bestätigung der Kündigung für ${contractName}`,
    body: `
      <h2 style="color: #34c759;">✅ Kündigung erfolgreich versendet!</h2>
      
      <p>Ihre Kündigung für <strong>${contractName}</strong> wurde soeben an ${provider || "den Anbieter"} gesendet.</p>
      
      <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
        <h3>📋 Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li>📅 <strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</li>
          <li>📧 <strong>Gesendet an:</strong> ${provider || "Anbieter"}</li>
          <li>🆔 <strong>Referenz-ID:</strong> ${cancellationId}</li>
        </ul>
      </div>
      
      <h3>📄 Kopie Ihres Kündigungsschreibens:</h3>
      <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${letter}</pre>
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background: #f0fdf4; border-radius: 8px;">
        <h3>💡 Was passiert als nächstes?</h3>
        <ol>
          <li>Der Anbieter wird Ihre Kündigung bearbeiten</li>
          <li>Sie erhalten eine Bestätigung vom Anbieter (normalerweise innerhalb von 14 Tagen)</li>
          <li>Wir archivieren Ihre Kündigung sicher in Contract AI</li>
          <li>Sie werden keine weiteren Erinnerungen für diesen Vertrag erhalten</li>
        </ol>
      </div>
      
      <p style="margin-top: 30px;">
        <strong>Tipp:</strong> Bewahren Sie diese E-Mail als Nachweis auf, bis Sie die Kündigungsbestätigung vom Anbieter erhalten haben.
      </p>
    `,
    cta: {
      text: "Kündigungen verwalten",
      url: `${process.env.FRONTEND_URL || 'https://contract-ai.de'}/cancellations`
    }
  });
  
  await transporter.sendMail({
    from: `"Contract AI" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: `✅ Kündigungsbestätigung: ${contractName}`,
    html: htmlContent
  });
}

module.exports = router;