const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database(), auth = firebase.auth();

let allMedia = [], currentUser = null, activeMedia = null;

// TRADUTOR DE ERROS
function traduzirErro(code) {
    switch (code) {
        case 'auth/email-already-in-use': return "⚠️ Este e-mail já está em uso.";
        case 'auth/wrong-password': return "🔑 Senha incorreta.";
        case 'auth/user-not-found': return "👤 Usuário não encontrado.";
        case 'auth/weak-password': return "🔒 Senha muito fraca (mínimo 6 caracteres).";
        case 'auth/invalid-email': return "📧 E-mail inválido.";
        default: return "❌ Ocorreu um erro inesperado.";
    }
}

const ui = {
    toggleLoader: (show) => {
        const loader = document.getElementById('loader-screen');
        if (show) loader.classList.remove('hidden');
        else {
            loader.style.opacity = '0';
            setTimeout(() => loader.classList.add('hidden'), 500);
        }
    },
    toggleAuth: (mode) => {
        document.getElementById('form-login').classList.toggle('hidden', mode === 'register');
        document.getElementById('form-register').classList.toggle('hidden', mode === 'login');
    },
    toggleSidebar: () => {
        const sb = document.getElementById('sidebar');
        sb.classList.toggle('open');
        document.getElementById('sidebar-overlay').style.display = sb.classList.contains('open') ? 'block' : 'none';
    },
    openModal: (media) => {
        activeMedia = media;
        document.getElementById('modal-title').innerText = media.title;
        document.getElementById('modal-sinopse').innerText = media.sinopse || "Sem descrição.";
        document.getElementById('modal-video-preview').innerHTML = `<video autoplay muted loop playsinline><source src="${media.video}"></video>`;
        document.getElementById('modal-details').classList.remove('hidden');
    },
    closeModal: () => {
        document.getElementById('modal-details').classList.add('hidden');
        document.getElementById('modal-video-preview').innerHTML = "";
    },
    startPlayer: () => {
        ui.closeModal();
        document.getElementById('player-overlay').classList.remove('hidden');
        document.getElementById('video-container').innerHTML = `<video controls autoplay><source src="${activeMedia.video}" type="video/mp4"></video>`;
    },
    closePlayer: () => {
        document.getElementById('player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = "";
    }
};

const app = {
    init: () => {
        setTimeout(() => ui.toggleLoader(false), 5000); // Destrava em 5s
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const snap = await db.ref('users/' + user.uid).once('value');
                currentUser = snap.val();
                app.showApp();
            } else app.showAuth();
        });
    },
    showApp: () => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        if (currentUser?.role === 'admin') document.getElementById('btn-admin-panel').classList.remove('hidden');
        ui.toggleLoader(false);
        app.loadCatalog();
    },
    showAuth: () => {
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        ui.toggleLoader(false);
    },
    login: async () => {
        const e = document.getElementById('login-email').value, p = document.getElementById('login-pass').value;
        if (!e || !p) return alert("Preencha os campos!");
        ui.toggleLoader(true);
        try { await auth.signInWithEmailAndPassword(e, p); }
        catch (err) { ui.toggleLoader(false); alert(traduzirErro(err.code)); }
    },
    register: async () => {
        const e = document.getElementById('reg-email').value, p = document.getElementById('reg-pass').value;
        ui.toggleLoader(true);
        try {
            const res = await auth.createUserWithEmailAndPassword(e, p);
            await db.ref('users/' + res.user.uid).set({ email: e, role: 'user' });
            location.reload();
        } catch (err) { ui.toggleLoader(false); alert(traduzirErro(err.code)); }
    },
    logout: () => auth.signOut().then(() => location.reload()),
    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            allMedia = [];
            const rMov = document.getElementById('row-movies'), rSer = document.getElementById('row-series'), rFeat = document.getElementById('row-featured');
            rMov.innerHTML = ""; rSer.innerHTML = ""; rFeat.innerHTML = "";
            snap.forEach(i => {
                const m = i.val(); m.key = i.key; allMedia.push(m);
                const card = document.createElement('div');
                card.className = 'card'; card.style.backgroundImage = `url(${m.img})`;
                card.onclick = () => ui.openModal(m);
                if (m.type === 'movie') rMov.appendChild(card); else rSer.appendChild(card);
                if (allMedia.length <= 5) rFeat.appendChild(card.cloneNode(true)).onclick = () => ui.openModal(m);
            });
        });
    }
};

window.onload = app.init;
