/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize Firebase Admin
admin.initializeApp();

// Cloud Function to set admin privilege
exports.addAdminRole = functions.https.onCall(async (data, context) => {
  // Check if the request is made by an admin
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can add other admins",
    );
  }

  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(data.email);

    // Set custom claim (admin: true)
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
    });

    // Return success
    return {
      result: `Success! ${data.email} has been made an admin.`,
    };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Function to create the first admin (use this only once)
exports.createInitialAdmin = functions.https.onRequest(async (req, res) => {
  // This should be your email
  const adminEmail = req.query.email;

  if (!adminEmail) {
    res.status(400).send("Email parameter is required");
    return;
  }

  try {
    // Get user
    const user = await admin.auth().getUserByEmail(adminEmail);

    // Make them admin
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
    });

    res.json({
      result: `Success! ${adminEmail} has been made an admin.`,
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});
