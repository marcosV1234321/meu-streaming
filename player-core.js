const PlayerCore = {
    currentMedia: null,
    contactInfo: { zap: "5511999999999" }, // Altere no seu ADM depois
    precos: {
        bronze: { nome: "Bronze (1 Tela)", valor: "19,90", link: "https://buy.stripe.com/exemplo1" },
        prata: { nome: "Prata (2 Telas)", valor: "29,90", link: "https://buy.stripe.com/exemplo2" },
        ouro: { nome: "Ouro (4 Telas)", valor: "44,90", link: "https://buy.stripe.com/exemplo3" }
    },

    init() {
        this.injectStyles();
        this.renderInterface();
        this.renderCatalog();
        this.renderAdminStats();
    },

    // 1. ESTILOS DA INTERFACE
    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .plan-container { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; padding: 20px; margin-top:30px; }
            .plan-card { background: #181818; border: 2px solid #333; padding: 30px; border-radius: 15px; width: 260px; text-align: center; transition: 0.3s; }
            .plan-card:hover { border-color: #e50914; transform: translateY(-5px); }
            .plan-card h2 { color: #e50914; font-size: 22px; }
            .plan-price { font-size: 30px; font-weight: bold; margin: 20px 0; color: white; }
            .btn-plan { background: #e50914; color: white; border: none; padding: 12px; width: 100%; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: 10px; }
            .btn-pix { background: #25d366; color: white; border: none; padding: 12px; width: 100%; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: 10px; }
            .hidden { display: none !important; }
        `;
        document.head.appendChild(style);
    },

    // 2. TELA DE PLANOS (APARECE QUANDO VENCE OU BLOQUEIA)
    showSubscriptionScreen(msg = "Escolha seu Plano") {
        const app = document.getElementById('app-screen');
        const login = document.getElementById('login-screen');
        if(app) app.classList.add('hidden');
        if(login) login.classList.add('hidden');

        let payScreen = document.getElementById('pay-screen');
        if(!payScreen) {
            payScreen = document.createElement('div');
            payScreen.id = 'pay-screen';
            payScreen.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:#141414; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:white; overflow-y:auto; padding:40px 0;";
            document.body.appendChild(payScreen);
        }
        payScreen.classList.remove('hidden');

        payScreen.innerHTML = `
            <h1 style="color:#e50914; font-size:40px;">${msg}</h1>
            <p style="font-size:18px;">Assine agora para liberar acesso ilimitado.</p>
            <div class="plan-container">
                ${Object.entries(this.precos).map(([key, p]) => `
                    <div class="plan-card">
                        <div style="background:#27ae60; color:white; padding:4px; border-radius:5px; font-size:11px; margin-bottom:10px;">7 DIAS GRÁTIS NOVO USER</div>
                        <h2>${p.nome}</h2>
                        <div class="plan-price">R$ ${p.valor}</div>
                        <p style="color:gray; font-size:13px; margin-bottom:20px;">✓ Sem anúncios<br>✓ Qualidade máxima<br>✓ Cancelamento fácil</p>
                        <button class="btn-plan" onclick="PlayerCore.checkout('${key}')">CARTÃO DE CRÉDITO</button>
                        <button class="btn-pix" onclick="PlayerCore.payPix('${p.nome}')">PAGAR COM PIX</button>
                    </div>
                `).join('')}
            </div>
            <p onclick="auth.signOut(); location.reload();" style="margin-top:30px; color:gray; cursor:pointer;">Sair da conta</p>
        `;
    },

    checkout(key) {
        const p = this.precos[key];
        window.location.href = `${p.link}?prefilled_email=${encodeURIComponent(auth.currentUser.email)}`;
    },

    payPix(plano) {
        const msg = encodeURIComponent(`Olá Master! Quero pagar o ${plano}. Meu e-mail é: ${auth.currentUser.email}`);
        window.open(`https://wa.me/${this.contactInfo.zap}?text=${msg}`, '_blank');
    },

    // 3. MONITOR DE ACESSO (O CORAÇÃO DO SISTEMA)
    checkUserStatus(user) {
        db.ref('users/' + user.uid).on('value', snap => {
            const u = snap.val();
            if(!u) return;

            // Se for Admin, entra direto
            if(u.role === 'admin') {
                document.getElementById('app-screen').classList.remove('hidden');
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('btn-master').classList.remove('hidden');
                return;
            }

            const agora = new Date();
            const expira = new Date(u.valido_ate);

            if (agora > expira) {
                this.showSubscriptionScreen("SEU TEMPO ACABOU");
            } else {
                document.getElementById('app-screen').classList.remove('hidden');
                document.getElementById('login-screen').classList.add('hidden');
            }
        });
    },

    // ... (restante das funções de Interface, Catalogo e Admin mantidas como antes)
    renderInterface() { /* ... */ },
    renderCatalog() { /* ... */ },
    renderAdminStats() { /* ... */ }
};

// --- FUNÇÃO DE CADASTRO CORRIGIDA (CHAMADA PELO HTML) ---
async function executarCadastro() {
    const email = document.getElementById('new-email').value.trim();
    const pass = document.getElementById('new-pass').value.trim();

    if(!email || pass.length < 6) return alert("E-mail válido e senha de no mínimo 6 dígitos!");

    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        const uid = res.user.uid;

        // Define 7 dias a partir de hoje
        const trialDate = new Date();
        trialDate.setDate(trialDate.getDate() + 7);

        await db.ref('users/' + uid).set({
            email: email,
            role: 'user',
            status: 'trial',
            valido_ate: trialDate.toISOString(),
            cadastro: new Date().toISOString()
        });

        alert("CONTA CRIADA! Você ganhou 7 dias de teste grátis.");
        location.reload(); // Recarrega para o Monitor de Acesso entrar em ação
    } catch(e) {
        alert("Erro no Cadastro: " + e.message);
    }
}

// Inicia o monitoramento de login
auth.onAuthStateChanged(user => {
    if(user) {
        PlayerCore.checkUserStatus(user);
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        const ps = document.getElementById('pay-screen');
        if(ps) ps.classList.add('hidden');
    }
});

PlayerCore.init();
