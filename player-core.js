const PlayerCore = {
    currentMedia: null,
    contactInfo: { zap: "", email_suporte: "" },
    precos: {
        bronze: { nome: "Bronze (1 Tela)", valor: "19,90", link: "LINK_STRIPE_1" },
        prata: { nome: "Prata (2 Telas)", valor: "29,90", link: "LINK_STRIPE_2" },
        ouro: { nome: "Ouro (4 Telas)", valor: "44,90", link: "LINK_STRIPE_3" }
    },

    init() {
        this.injectStyles();
        this.renderInterface();
        this.renderCatalog();
        this.renderAdminStats();
        this.loadSettings();
    },

    // 1. MONITOR DE ACESSO E AVISO DE VENCIMENTO
    checkAccess(user) {
        db.ref('users/' + user.uid).on('value', snap => {
            const u = snap.val();
            if (!u || u.role === 'admin') return;

            const agora = new Date();
            const expira = new Date(u.valido_ate);
            const diffDias = Math.ceil((expira - agora) / (1000 * 60 * 60 * 24));

            // Bloqueio Total
            if (agora > expira) {
                this.showSubscriptionScreen("Seu acesso expirou. Renove para continuar assistindo!");
            } 
            // Aviso de Vencimento Próximo (Faltando 2 dias ou menos)
            else if (diffDias <= 2 && diffDias > 0) {
                this.notifyExpiring(diffDias);
            }
        });
    },

    // Envia alerta visual e prepara o e-mail
    notifyExpiring(dias) {
        if (sessionStorage.getItem('aviso_visto')) return;
        
        const alerta = document.createElement('div');
        alerta.style = "position:fixed; top:80px; right:20px; background:var(--red); padding:15px; border-radius:8px; z-index:5000; box-shadow:0 0 20px #000; animation: slideIn 0.5s;";
        alerta.innerHTML = `
            <strong>⚠️ Atenção Master!</strong><br>
            Sua assinatura vence em ${dias} dia(s).<br>
            <button onclick="PlayerCore.showSubscriptionScreen(); this.parentElement.remove()" style="margin-top:10px; border:none; padding:5px; cursor:pointer; font-weight:bold;">RENOVAR AGORA</button>
            <span onclick="this.parentElement.remove()" style="margin-left:10px; cursor:pointer;">✖</span>
        `;
        document.body.appendChild(alerta);
        sessionStorage.setItem('aviso_visto', 'true');
        
        // Aqui o Webhook ou uma Function enviaria o E-mail automático
        console.log("Enviando lembrete de renovação para o e-mail do cliente...");
    },

    // 2. CHECKOUT STRIPE COM E-MAIL PRÉ-PREENCHIDO
    checkout(planoKey) {
        const plano = this.precos[planoKey];
        const email = auth.currentUser.email;
        // Redireciona para o Stripe passando o e-mail para o Webhook identificar
        window.location.href = `${plano.link}?prefilled_email=${encodeURIComponent(email)}`;
    },

    // 3. TELA DE PLANOS PROFISSIONAL
    showSubscriptionScreen(msg = "Escolha seu plano") {
        const payScreen = document.getElementById('pay-screen');
        payScreen.classList.remove('hidden');
        payScreen.innerHTML = `
            <div style="padding:40px;">
                <h1 style="color:var(--red);">${msg}</h1>
                <div class="plan-container">
                    ${Object.entries(this.precos).map(([key, p]) => `
                        <div class="plan-card">
                            <h2>${p.nome}</h2>
                            <div class="plan-price">R$ ${p.valor}</div>
                            <button class="btn-red" onclick="PlayerCore.checkout('${key}')">ASSINAR COM CARTÃO</button>
                            <button class="btn-red" style="background:#25d366; margin-top:10px;" onclick="PlayerCore.payPix('${p.nome}')">PAGAR VIA PIX</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    payPix(planoNome) {
        const zap = this.contactInfo.zap;
        const msg = `Olá! Realizei o pagamento do ${planoNome}. E-mail: ${auth.currentUser.email}`;
        window.open(`https://wa.me/${zap}?text=${encodeURIComponent(msg)}`, '_blank');
    },

    // ... (restante das funções de Interface, Catalog, Admin mantidas)
};

// Monitor de Login
auth.onAuthStateChanged(user => {
    if(user) PlayerCore.checkAccess(user);
});
