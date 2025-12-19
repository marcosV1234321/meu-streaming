const PlayerCore = {
    currentMedia: null,
    contactInfo: { zap: "5511999999999", email: "" },

    init() {
        this.injectStyles();
        this.renderInterface();
        this.renderCatalog();
        this.renderAdminStats();
        this.loadContactInfo();
    },

    // 1. ESTILOS PARA MENU OCULTO E BUSCADOR INTELIGENTE
    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            /* Menu Lateral Escondido por Padrão */
            #sidebar { position: fixed; left: -250px; top: 0; width: 200px; height: 100%; background: rgba(0,0,0,0.95); display: flex; flex-direction: column; padding-top: 80px; z-index: 3000; transition: 0.4s; border-right: 1px solid var(--red); }
            #sidebar.open { left: 0; }
            
            .side-item { color: gray; margin: 15px 0; cursor: pointer; display: flex; align-items: center; padding-left: 20px; font-size: 16px; }
            .side-item:hover { color: white; }
            .side-spacer { flex-grow: 1; }

            /* Botão das 4 Barrinhas (Menu Hamburguer) */
            .menu-toggle { font-size: 28px; color: white; cursor: pointer; margin-right: 20px; transition: 0.3s; }
            .menu-toggle:hover { color: var(--red); }

            /* Buscador que aparece ao passar o mouse */
            .search-container { display: flex; align-items: center; position: relative; margin-right: 20px; height: 40px; }
            #search-bar { width: 0; padding: 0; opacity: 0; background: #222; border: 1px solid #444; color: white; border-radius: 20px; outline: none; transition: 0.5s; }
            .search-container:hover #search-bar { width: 200px; padding: 8px 15px; opacity: 1; }
            .search-icon { font-size: 20px; cursor: pointer; }

            /* Overlay para fechar menu ao clicar fora */
            #sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; z-index: 2900; }
        `;
        document.head.appendChild(style);
    },

    // 2. INTERFACE COM MENU DE BARRINHAS E BUSCA HOVER
    renderInterface() {
        // Injetar Botão de Menu e Buscador no Header
        const header = document.querySelector('header');
        const headerLeft = header.querySelector('div:first-child');
        const headerRight = header.querySelector('div:last-child');

        // Botão de Barrinhas
        const menuBtn = document.createElement('span');
        menuBtn.className = 'menu-toggle';
        menuBtn.innerHTML = '☰'; // Você pode usar 4 barras se preferir, mas ☰ é o padrão
        menuBtn.onclick = () => this.toggleMenu();
        headerLeft.prepend(menuBtn);

        // Container de Busca (Aparece no hover)
        const searchCont = document.createElement('div');
        searchCont.className = 'search-container';
        searchCont.innerHTML = `
            <span class="search-icon">🔍</span>
            <input type="text" id="search-bar" placeholder="O que vamos assistir?">
        `;
        headerRight.prepend(searchCont);
        document.getElementById('search-bar').oninput = (e) => this.search(e.target.value);

        // Menu Lateral
        const sidebar = document.createElement('div');
        sidebar.id = 'sidebar';
        sidebar.innerHTML = `
            <div class="side-item" onclick="PlayerCore.filter('all')">🏠 Início</div>
            <div class="side-item" onclick="PlayerCore.filter('kids')">🧒 Infantil</div>
            <div class="side-item" onclick="PlayerCore.filter('movie')">🎬 Filmes</div>
            <div class="side-item" onclick="PlayerCore.filter('tv')">📺 Séries</div>
            <div class="side-spacer"></div>
            <div class="side-item" onclick="PlayerCore.openContact()">📞 Suporte</div>
        `;
        document.body.appendChild(sidebar);

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.onclick = () => this.toggleMenu();
        document.body.appendChild(overlay);
    },

    toggleMenu() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebar-overlay');
        sb.classList.toggle('open');
        ov.style.display = sb.classList.contains('open') ? 'block' : 'none';
    },

    // --- LOGICA DE CATALOGO E BUSCA ---
    search(q) { this.renderCatalog('all', q); },
    filter(f) { this.toggleMenu(); this.renderCatalog(f); },

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

    // --- RESTANTE DAS FUNÇÕES (INFO, PLAYER, ADMIN) ---
    openInfo(media, key) {
        this.currentMedia = { ...media, key };
        const modal = document.getElementById('info-modal');
        document.getElementById('info-poster').style.backgroundImage = `url(${media.img})`;
        document.getElementById('info-title').innerText = media.title;
        document.getElementById('info-synopsis').innerText = media.overview || "Sem sinopse disponível.";
        modal.style.display = 'block';
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
        container.innerHTML = `<video controls autoplay style="width:100%; height:100%;"><source src="${media.video}" type="video/mp4"></video>`;
        playerModal.style.display = 'block';
    },

    loadContactInfo() {
        db.ref('settings/contact').on('value', snap => { if(snap.val()) this.contactInfo = snap.val(); });
    },

    openContact() {
        window.open(`https://wa.me/${this.contactInfo.zap}`, '_blank');
    },

    renderAdminStats() {
        const adminView = document.getElementById('admin-view');
        if (!adminView) return;
        let stats = document.getElementById('admin-contact-config');
        if (!stats) {
            stats = document.createElement('div');
            stats.id = 'admin-contact-config';
            stats.innerHTML = `
                <div style="background:#222; padding:15px; border-radius:8px; border:1px solid #444; margin-top:15px;">
                    <h4>⚙️ CONFIGURAÇÃO DE CONTATO</h4>
                    <input type="text" id="cfg-zap" placeholder="WhatsApp (55...)">
                    <button class="btn-red" onclick="PlayerCore.saveSettings()">SALVAR</button>
                    <div id="media-list-adm" style="margin-top:20px;"></div>
                </div>`;
            adminView.appendChild(stats);
        }
    },

    saveSettings() {
        const zap = document.getElementById('cfg-zap').value;
        db.ref('settings/contact').set({ zap }).then(() => alert("Salvo!"));
    }
};

// Funções Globais
async function addMedia() {
    const id = document.getElementById('adm-id').value;
    const type = document.getElementById('adm-type').value;
    const url = document.getElementById('adm-url').value;
    const isKids = confirm("É conteúdo infantil?");
    const TMDB_KEY = "2eaf2fd731f81a77741ecb625b588a40";
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=pt-BR`);
        const d = await res.json();
        await db.ref('catalog').push({ title: d.title || d.name, img: `https://image.tmdb.org/t/p/w500${d.poster_path}`, video: url, tmdbId: id, type, isKids, overview: d.overview, views: 0 });
        alert("Publicado!");
    } catch(e) { alert("Erro!"); }
}

function closePlayer() { document.getElementById('player-modal').style.display = 'none'; document.getElementById('video-container').innerHTML = ""; }

PlayerCore.init();
