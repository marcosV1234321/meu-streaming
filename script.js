const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let state = { allMedia: [], tempTMDB: null };

const app = {
    init: () => {
        // Observador de Login
        auth.onAuthStateChanged(user => {
            if (user) {
                document.getElementById('auth-screen').classList.add('hidden');
                document.getElementById('app-content').classList.remove('hidden');
                app.loadCatalog();
                app.loadApiKeys();
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('app-content').classList.add('hidden');
            }
        });
    },

    // AÇÕES DE LOGIN E CADASTRO
    login: () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        if(!e || !p) return alert("Preencha tudo!");
        auth.signInWithEmailAndPassword(e, p).catch(err => alert("Erro: " + err.message));
    },

    register: () => {
        const e = document.getElementById('reg-email').value;
        const p = document.getElementById('reg-pass').value;
        const tel = document.getElementById('reg-phone').value;
        if(!e || !p || !tel) return alert("Preencha todos os campos!");

        auth.createUserWithEmailAndPassword(e, p).then(res => {
            db.ref(`users/${res.user.uid}`).set({
                email: e,
                phone: tel,
                blocked: false
            }).then(() => alert("Cadastrado com sucesso!"));
        }).catch(err => alert("Erro ao cadastrar: " + err.message));
    },

    logout: () => auth.signOut(),

    // CATÁLOGO ESTILO NETFLIX (ABAS PEQUENAS)
    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = "";
            const categorias = ["Filmes", "Séries", "Kids"];

            categorias.forEach(cat => {
                let section = `<div class="row"><h3>${cat}</h3><div class="cards-container">`;
                snap.forEach(item => {
                    const m = item.val();
                    if(m.category === cat) {
                        section += `<div class="movie-card" onclick="ui.openPlayer('${m.video}')" style="background-image:url(${m.img})"></div>`;
                    }
                });
                section += `</div></div>`;
                area.innerHTML += section;
            });
        });
    },

    // GESTÃO DE APIs
    saveApiKey: () => {
        const n = document.getElementById('api-name').value;
        const v = document.getElementById('api-val').value;
        if(!n || !v) return;
        db.ref('settings/apiKeys').push({ name: n, value: v });
    },

    loadApiKeys: () => {
        db.ref('settings/apiKeys').on('value', snap => {
            const list = document.getElementById('list-apis');
            list.innerHTML = "";
            snap.forEach(c => {
                list.innerHTML += `<div class="item-list">${c.val().name} <button onclick="app.removeKey('${c.key}')">Excluir</button></div>`;
            });
        });
    },

    removeKey: (id) => db.ref(`settings/apiKeys/${id}`).remove(),

    // TMDB
    fetchTMDB: async () => {
        const id = document.getElementById('tmdb-id').value;
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
        const data = await res.json();
        state.tempTMDB = data;
        document.getElementById('preview-movie').innerHTML = `Carregado: ${data.title}`;
    },

    postMedia: () => {
        if(!state.tempTMDB) return;
        db.ref('catalog').push({
            title: state.tempTMDB.title,
            img: `https://image.tmdb.org/t/p/w500${state.tempTMDB.poster_path}`,
            video: document.getElementById('video-url').value,
            category: document.getElementById('manual-cat').value,
            sinopse: state.tempTMDB.overview
        }).then(() => alert("Postado!"));
    }
};

const ui = {
    toggleAuth: () => {
        document.getElementById('login-form').classList.toggle('hidden');
        document.getElementById('register-form').classList.toggle('hidden');
    },
    toggleAdmin: () => document.getElementById('admin-panel').classList.toggle('hidden'),
    switchTab: (id) => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        if(id === 'tab-users') app.loadUsers();
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
