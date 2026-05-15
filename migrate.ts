import admin from 'firebase-admin';

async function migrate() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("No FIREBASE_SERVICE_ACCOUNT found in environment.");
    // Fallback: print instructions for manual migration
    console.log("Please run this in an environment where FIREBASE_SERVICE_ACCOUNT is set.");
    return;
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
      });
  }

  const db = admin.firestore();
  console.log("Migrating users...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  let batch = db.batch();
  let count = 0;
  let batches = 0;

  for (const doc of snapshot.docs) {
      const data = doc.data();
      const coins = data.coins || 0;
      const diamonds = data.diamonds || 0;
      
      if (coins > 0) {
          batch.update(doc.ref, {
              diamonds: diamonds + coins,
              coins: 0,
              updatedAt: Date.now()
          });
          count++;
          
          if (count % 400 === 0) {
              await batch.commit();
              batches++;
              batch = db.batch();
          }
      }
  }

  if (count % 400 !== 0) {
      await batch.commit();
  }

  console.log(`Migrated ${count} users successfully.`);
}

migrate().then(() => process.exit(0)).catch(console.error);
