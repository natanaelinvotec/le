// Roda as migrações pendentes (uma vez só cada; ficam marcadas em
// config/migracoes). O GitHub Actions chama isto depois de publicar.
// Uso manual: GOOGLE_APPLICATION_CREDENTIALS=chave.json node scripts/migrar.mjs [--forcar]
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { executarMigracoes } from '../src/rotinas.js';

process.env.TZ = 'America/Campo_Grande';
const projeto = process.env.PROJETO || 'atletapay-br';
const bucket = process.env.BUCKET || `${projeto}.firebasestorage.app`;
initializeApp({ projectId: projeto, storageBucket: bucket });

const ctx = { db: getFirestore(), bucket: getStorage().bucket(), auth: getAuth(), messaging: null, vision: null, log: console, silencioso: true };
const forcar = process.argv.includes('--forcar');
const r = await executarMigracoes(ctx, { forcar });
console.log('Migrações:', JSON.stringify(r, null, 2));
