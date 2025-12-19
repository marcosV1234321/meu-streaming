const PlayerCore = {
    currentMedia: null,

    init() {
        this.injectStyles();
        this.renderInterface();
        this.renderCatalog();
        this.renderAdminStats();
        this.loadContactInfo(); // Carrega os dados de contato do banco
    },

    // 1. ESTILOS ATUALIZADOS (MENU COM SUPORTE E CONTATO)
    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            #sidebar { position: fixed; left: 0; top: 0; width: 60px; height: 100%; background: #000; display: flex; flex-direction: column; align-items: center; padding: 80px 0 20px 0; z-index: 900; transition: 0.3s; border-right: 1px solid #333; }
            #sidebar:hover { width: 180px; }
            .side-item { color: gray; margin: 15px 0; cursor: pointer; display: flex; align-items: center; width: 100%; padding-left: 20px; }
            .side-item:hover { color: white; }
            .side-text { display: none; margin-left: 15px; font-size: 14px; }
            #sidebar:hover .side-text { display: block; }
            .side-spacer { flex-grow: 1; } /* Empurra o suporte para baixo */

            #info-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 800px; background: #181818; z-index: 1500; display: none; border-radius: 8px; overflow: hidden; box-shadow: 0 0 50px #000; }
            .info-content { display: flex; flex-wrap: wrap; }
            .info-img { width: 300px; height: 450px; background-size: cover; }
            .info-text { flex: 1; padding: 30px; min-width: 300px; }
            
            #search-bar { width: 200px; padding: 8px; background: #222; border: 1px solid #444; color: white; border-radius: 20px; margin-right: 15px; outline: none; }
            .admin-section { background: #222; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #444; }
        `;
        document.head.appendChild(style);
    },

    // 2. INTERFACE COM MENU LATERAL E SUPORTE
    renderInterface() {
        const sidebar = document.createElement('div');
        sidebar.id = 'sidebar';
        sidebar.innerHTML = `
            <div class="side-item" onclick="PlayerCore.filter('all')">🏠 <span class="side-text">Início</span></div>
            <div class="side-item" onclick="PlayerCore.filter('kids')">🧒 <span class="side-text">Infantil</span></div>
            <div class="side-item" onclick="PlayerCore.filter('movie')">🎬 <span class="side-text">Filmes</span></div>
            <div class="side-item" onclick="PlayerCore.filter('tv')">📺 <span class="side-text">Séries</span></div>
            <div class="side-spacer"></div>
            <div class="side-item" onclick="PlayerCore.openContact()">📞 <span class="side-text">Suporte</span></div>
        `;
        document.body.appendChild(sidebar);

        // Barra de Busca
        const headerRight = document.querySelector('header div:last-child');
        const searchInput = document.createElement('input');
        searchInput.id = 'search-bar';
        searchInput.placeholder = '🔍 Buscar...';
        searchInput.oninput = (e) => this.search(e.target.value);
        headerRight.prepend(searchInput);

        // Modal de Info (Sinopse)
        const infoModal = document.createElement('div');
        infoModal.id = 'info-modal';
        infoModal.innerHTML = `
            <div class="info-content">
                <div id="info-poster" class="info-img"></div>
                <div class="info-text">
                    <h1 id="info-title"></h1>
                    <p id="info-synopsis" style="color: #ccc;"></p>
                    <button class="btn-red" style="width: 200px;" onclick="PlayerCore.playNow()">▶ ASSISTIR</button>
                    <button class="btn-red" style="width: 50px; background: #444; margin-left: 10px;" onclick="PlayerCore.closeInfo()">✕</button>
                </div>
            </div>
        `;
        document.body.appendChild(infoModal);
    },

    // 3. CARREGA DADOS DE CONTATO DO FIREBASE
    loadContactInfo() {
        db.ref('settings/contact').on('value', snap => {
            const data = snap.val();
            this.contactInfo = data || { email: "suporte@masterflix.com", zap: "5511999999999" };
        });
    },

    openContact() {
        const msg = `Olá! Sou usuário do Master Flix e preciso de ajuda.`;
        const url = `https://wa.me/${this.contactInfo.zap}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    },

    // 4. ÁREA ADM PARA ALTERAR CONTATO
    renderAdminStats() {
        const adminView = document.getElementById('admin-view');
        if (!adminView) return;

        let contactSection = document.getElementById('admin-contact-config');
        if (!contactSection) {
            contactSection = document.createElement('div');
            contactSection.id = 'admin-contact-config';
            contactSection.className = 'admin-section';
            contactSection.innerHTML = `
                <h4>⚙️ CONFIGURAÇÕES DE CONTATO</h4>
                <input type="text" id="cfg-zap" placeholder="WhatsApp (Somente números: 55...)">
                <input type="email" id="cfg-email" placeholder="E-mail de Suporte">
                <button class="btn-red" onclick="PlayerCore.saveSettings()">SALVAR CONTATOS</button>
                <div id="media-list-adm" style="margin-top:20px;"></div>
            `;
            adminView.appendChild(contactSection);
        }
    },

    saveSettings() {
        const zap = document.getElementById('cfg-zap').value;
        const email = document.getElementById('cfg-email').value;
        if(!zap || !email) return alert("Preencha os campos de contato!");
        
        db.ref('settings/contact').set({ zap, email })
            .then(() => alert("Configurações salvas com sucesso!"))
            .catch(e => alert("Erro ao salvar: " + e.message));
    },

    // --- FUNÇÕES DE CATÁLOGO E PLAYER ---
    renderCatalog(filter = 'all', query = '') {
        const rows = { movie: document.getElementById('row-movies'), tv: document.getElementById('row-series') };
        db.ref('catalog').on('value', snap => {
            rows.movie.innerHTML = ""; rows.tv.innerHTML = "";
            snap.forEach(item => {
                const m = item.val();
                if (filter !== 'all' && m.type !== filter && !(filter === 'kids' && m.isKids)) return;
                if (query && !m.title.toLowerCase().includes(query.toLowerCase())) return;

                const card = document.createElement('div');
                card.className = 'card';
                card.style.backgroundImage = `url(${m.img})`;
                card.onclick = () => this.openInfo(m, item.key);
                if (rows[m.type]) rows[m.type].appendChild(card);
            });
        });
    },

    async openInfo(media, key) {
        this.currentMedia = { ...media, key };
        document.getElementById('info-poster').style.backgroundImage = `url(${media.img})`;
        document.getElementById('info-title').innerText = media.title;
        document.getElementById('info-synopsis').innerText = media.overview || "Sem sinopse disponível.";
        document.getElementById('info-modal').style.display = 'block';
    },

    closeInfo() { document.getElementById('info-modal').style.display = 'none'; },
    playNow() { 
        this.closeInfo(); 
        db.ref(`catalog/${this.currentMedia.key}/views`).transaction(c => (c || 0) + 1);
        this.openAdvancedPlayer(this.currentMedia); 
    },

    openAdvancedPlayer(media) {
        const playerModal = document.getElementById('player-modal');
        const container = document.getElementById('video-container');
        container.innerHTML = `<video id="main-video" controls autoplay style="width:100%; height:100%;"><source src="${media.video}" type="video/mp4"></video>`;
        playerModal.style.display = 'block';
    },

    search(q) { this.renderCatalog('all', q); },
    filter(f) { this.renderCatalog(f); }
};

// Funções Globais
async function addMedia() {
    const id = document.getElementById('adm-id').value;
    const type = document.getElementById('adm-type').value;
    const url = document.getElementById('adm-url').value;
    const isKids = confirm("Este conteúdo é para crianças?");
    const TMDB_KEY = "2eaf2fd731f81a77741ecb625b588a40";

    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=pt-BR`);
        const d = await res.json();
        await db.ref('catalog').push({
            title: d.title || d.name,
            img: `https://image.tmdb.org/t/p/w500${d.poster_path}`,
            video: url,
            tmdbId: id,
            type: type,
            isKids: isKids,
            overview: d.overview,
            views: 0
        });
        alert("Mídia publicada!");
    } catch(e) { alert("Erro ao publicar!"); }
}

function closePlayer() { document.getElementById('player-modal').style.display = 'none'; document.getElementById('video-container').innerHTML = ""; }

PlayerCore.init();
