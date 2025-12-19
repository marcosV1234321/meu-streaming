// Monitor de Catálogo e Player Master
const PlayerCore = {
    init() {
        this.renderCatalog();
        console.log("Player Core Ativado: Buscando mídias...");
    },

    // 1. CORREÇÃO: Força a exibição das mídias na tela do usuário
    renderCatalog() {
        const rows = {
            movie: document.getElementById('row-movies'),
            tv: document.getElementById('row-series')
        };

        db.ref('catalog').on('value', (snapshot) => {
            rows.movie.innerHTML = "";
            rows.tv.innerHTML = "";

            if (!snapshot.exists()) return console.warn("Catálogo vazio no Firebase.");

            snapshot.forEach((item) => {
                const media = item.val();
                const card = document.createElement('div');
                card.className = 'card';
                card.style.backgroundImage = `url(${media.img})`;
                card.onclick = () => this.openAdvancedPlayer(media);
                
                if (rows[media.type]) rows[media.type].appendChild(card);
            });
        });
    },

    // 2. PLAYER COM CC, LEGENDAS E AJUSTE DE CONEXÃO
    openAdvancedPlayer(media) {
        const playerModal = document.getElementById('player-modal');
        const container = document.getElementById('video-container');
        
        // Detecta conexão para sugerir ajuste (Simulação de Bitrate)
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const quality = (connection && connection.saveData) ? "480p (Economia)" : "1080p (Auto)";

        container.innerHTML = `
            <div style="position:relative; width:100%; height:100%;">
                <video id="main-video" controls autoplay style="width:100%; height:100%;">
                    <source src="${media.video}" type="video/mp4">
                    <track label="Português" kind="subtitles" srclang="pt" src="${media.subtitle || ''}" default>
                </video>
                <div id="player-ui" style="position:absolute; bottom:50px; left:20px; pointer-events:none;">
                    <span style="background:rgba(0,0,0,0.7); padding:5px 10px; border-radius:4px; font-size:12px;">
                        📶 Qualidade: ${quality} | CC: Ativado
                    </span>
                </div>
            </div>
        `;
        playerModal.style.display = 'block';
    }
};

// Inicia automaticamente
PlayerCore.init();
