// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB...", // Ganti dengan API Key Anda
    authDomain: "tukar-kado.firebaseapp.com",
    databaseURL: "https://tukar-kado-default-rtdb.firebaseio.com",
    projectId: "tukar-kado",
    storageBucket: "tukar-kado.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef..."
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Firebase Database Service
const FirebaseService = {
    // Simpan data peserta
    saveParticipants(participants) {
        return database.ref('participants').set(participants)
            .then(() => {
                console.log('Data peserta tersimpan di Firebase');
                return true;
            })
            .catch(error => {
                console.error('Error menyimpan data:', error);
                return false;
            });
    },
    
    // Ambil data peserta
    getParticipants() {
        return database.ref('participants').once('value')
            .then(snapshot => {
                const data = snapshot.val();
                return data || [];
            })
            .catch(error => {
                console.error('Error mengambil data:', error);
                return [];
            });
    },
    
    // Simpan hasil acak
    saveResults(results) {
        return database.ref('results').set({
            data: results,
            timestamp: new Date().toISOString(),
            randomized: true
        })
            .then(() => {
                console.log('Hasil acak tersimpan di Firebase');
                return true;
            })
            .catch(error => {
                console.error('Error menyimpan hasil:', error);
                return false;
            });
    },
    
    // Ambil hasil acak
    getResults() {
        return database.ref('results').once('value')
            .then(snapshot => {
                const data = snapshot.val();
                return data || null;
            })
            .catch(error => {
                console.error('Error mengambil hasil:', error);
                return null;
            });
    },
    
    // Reset semua data
    resetAllData() {
        return database.ref().set(null)
            .then(() => {
                console.log('Semua data direset');
                return true;
            })
            .catch(error => {
                console.error('Error reset data:', error);
                return false;
            });
    },
    
    // Cek apakah ada data
    checkDataExists() {
        return database.ref('participants').once('value')
            .then(snapshot => {
                return snapshot.exists();
            });
    },
    
    // Listen for realtime changes (optional)
    onParticipantsChange(callback) {
        database.ref('participants').on('value', snapshot => {
            callback(snapshot.val() || []);
        });
    }
};