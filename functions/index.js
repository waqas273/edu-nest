const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function: Delete User from Auth when Firestore Document is Deleted
 * Trigger: Firestore onDelete hook for 'users/{userId}' path
 * Reason: Fixes "Zombie Accounts" where Admin deletes Doc but Auth remains.
 */
exports.deleteUser = functions.firestore
    .document('users/{userId}')
    .onDelete(async (snap, context) => {
        const { userId } = context.params;
        const deletedData = snap.data();
        const userEmail = deletedData.email || 'Unknown';

        console.log(`[Admin Delete Fix] Deleting Auth User: ${userEmail} (UID: ${userId})`);

        try {
            await admin.auth().deleteUser(userId);
            console.log(`✅ Successfully deleted user from Firebase Authentication.`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`⚠️ User was not found in Auth (already clean).`);
            } else {
                console.error(`❌ Error deleting Auth user:`, error);
            }
        }
    });
