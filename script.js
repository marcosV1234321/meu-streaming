// Configuração do Firebase corrigida
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const app = {
    init: () => {
        auth.onAuthStateChanged(user => {
            if (user) {
                db.ref(`users/${user.uid}`).once('value', snap => {
                    const data = snap.val();
                    if(data?.role === 'master') document.getElementById('admin-btn').classList.remove('hidden');
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('app-content').classList.remove('hidden');
                    app.loadCatalog();
                });
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('app-content').classList.add('hidden');
            }
        });
    },

    login: () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        if(!e || !p) return alert("Preencha tudo");
        auth.signInWithEmailAndPassword(e, p).catch(err => alert("Erro: " + err.message));
    },

    register: () => {
        const e = document.getElementById('reg-email').value;
        const p = document.getElementById('reg-pass').value;
        const t = document.getElementById('reg-phone').value;
        auth.createUserWithEmailAndPassword(e, p).then(res => {
            db.ref(`users/${res.user.uid}`).set({ email: e, phone: t, role: 'user' });
        }).catch(err => alert(err.message));
    },

    logout: () => auth.signOut(),

    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = "";
            const cats = ["Filmes", "Séries", "Kids"];
            cats.forEach(c => {
                let html = `<div class="row"><h3>${c}</h3><div class="cards-container">`;
                snap.forEach(item => {
                    const m = item.val();
                    if(m.category === c) html += `<div class="movie-card" onclick="ui.openPlayer('${m.video}')" style="background-image:url(${m.img})"></div>`;
                });
                html += `</div></div>`;
                area.innerHTML += html;
            });
        });
    },

    saveApiKey: () => {
        const n = document.getElementById('api-name').value;
        const v = document.getElementById('api-val').value;
        db.ref('settings/apiKeys').push({ name: n, value: v }).then(() => alert("Salvo!"));
    }
};

const ui = {
    toggleAuth: () => {
        document.getElementById('login-form').classList.toggle('hidden');
        document.getElementById('register-form').classList.toggle('hidden');
    },
    toggleSidebar: () => document.getElementById('sidebar').classList.toggle('active'),
    toggleAdmin: () => document.getElementById('admin-panel').classList.toggle('hidden'),
    switchTab: (id) => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },
    openPlayer: (url) => {
        document.getElementById('player-modal').classList.remove('hidden');
        document.getElementById('video-inside').innerHTML = `<video src="${url}" controls autoplay style="width:100%"></video>`;
    },
    closePlayer: () => {
        document.getElementById('player-modal').classList.add('hidden');
        document.getElementById('video-inside').innerHTML = "";
    }
};

window.onload = app.init;
