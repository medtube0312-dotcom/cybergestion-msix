// ==============================================
// CYBERGESTION - SYSTÈME COMPLET CORRIGÉ
// ==============================================

// ==============================================
// VARIABLES GLOBALES
// ==============================================

let stockData = [];
let panier = [];
let panierServices = [];
let historiqueVentes = [];
let historiqueServices = [];
let servicesConfig = {};
let remiseGlobale = { active: false, type: 'DA', valeur: 0 };
let remiseGlobaleServices = { active: false, type: 'DA', valeur: 0 };
let typeExportChoisi = null; // pour l'export recap

// ==============================================
// GESTIONNAIRE DE SESSION
// ==============================================

const SessionManager = {
    currentUser: null,
    users: {},

    init() {
        console.log('🔐 Gestionnaire de session initialisé');
        this.chargerUtilisateurs();
        
        if (Object.keys(this.users).length === 0) {
            this.creerUtilisateurParDefaut();
        }
        
        this.configurerConnexionClavier();
        this.configurerBoutonConnexion();
        this.verifierSessionExistante();
        this.configurerRaccourcisClavier();
    },

    configurerBoutonConnexion() {
        const btnConnexion = document.getElementById('btn-connexion');
        if (btnConnexion) {
            btnConnexion.addEventListener('click', () => {
                this.tenterConnexion();
            });
        }
    },

    creerUtilisateurParDefaut() {
        this.users = {
            'admin': { 
                password: 'admin123', 
                droits: ['purge', 'parametres', 'export', 'reinitialisation', 'gestion_utilisateurs', 'annuler_vente', 'restaurer_vente', 'modifier_vente', 'gestion_stock', 'gestion_services', 'purge_recapitulatif'],
                nom: 'Administrateur',
                type: 'admin'
            },
            'vendeur': {
                password: 'vendeur123',
                droits: ['ventes', 'services', 'consultation'],
                nom: 'Vendeur Standard',
                type: 'vendeur',
                pin: '1234'
            }
        };
        this.sauvegarderUtilisateurs();
        console.log('👤 Utilisateurs par défaut créés');
    },

    configurerConnexionClavier() {
        document.addEventListener('keydown', (e) => {
            const loginModal = document.getElementById('login-modal');
            if (!loginModal || loginModal.style.display !== 'flex') return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                this.tenterConnexion();
            }
        });
    },

    configurerRaccourcisClavier() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.afficherDebugInfo();
            }
            
            if (e.key === 'Escape') {
                this.fermerModals();
            }
        });
    },

    afficherDebugInfo() {
        const debugInfo = {
            'Utilisateur': this.currentUser || 'Non connecté',
            'Stock': stockData?.length || 0,
            'Ventes': historiqueVentes?.length || 0,
            'Services': historiqueServices?.length || 0,
            'Theme': ThemeManager.getThemeActuel(),
            'Panier': panier?.length || 0,
            'Panier Services': panierServices?.length || 0
        };
        
        console.log('🐛 DEBUG SYSTEME:', debugInfo);
        alert('🐛 DEBUG SYSTEME:\n' + Object.entries(debugInfo)
            .map(([key, val]) => `${key}: ${val}`)
            .join('\n'));
    },

    fermerModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    },

    tenterConnexion() {
        const username = document.getElementById('login-username')?.value.trim();
        const password = document.getElementById('login-password')?.value.trim();
        
        if (!username || !password) {
            this.afficherErreurConnexion('Veuillez saisir le nom d\'utilisateur et le mot de passe');
            return;
        }
        
        if (this.seConnecter(username, password)) {
            console.log('✅ Connexion réussie:', username);
        } else {
            this.afficherErreurConnexion('Identifiants incorrects');
        }
    },

    afficherErreurConnexion(message) {
        const errorDiv = document.getElementById('login-error') || (() => {
            const div = document.createElement('div');
            div.id = 'login-error';
            div.style.cssText = 'color: var(--danger-color); background: rgba(220, 53, 69, 0.1); padding: 10px; border-radius: 5px; margin: 10px 0;';
            document.querySelector('#login-modal .modal-content').insertBefore(div, document.querySelector('#login-modal .action-buttons'));
            return div;
        })();
        
        errorDiv.textContent = `❌ ${message}`;
    },

    verifierSessionExistante() {
        try {
            const session = this.chargerSession();
            if (session && session.user && this.users[session.user]) {
                this.currentUser = session.user;
                this.debuterSession(this.currentUser);
                return;
            }
        } catch (error) {
            console.error('Erreur vérification session:', error);
        }
        this.afficherModalConnexion();
    },

    seConnecter(username, password) {
        const user = this.users[username];
        if (user && user.password === password) {
            this.currentUser = username;
            this.sauvegarderSession();
            this.debuterSession(username);
            return true;
        }
        return false;
    },

    debuterSession(username) {
        console.log('🚀 Début de session pour:', username);
        
        const loginModal = document.getElementById('login-modal');
        const mainApp = document.getElementById('main-app');
        
        if (loginModal) loginModal.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        
        this.mettreAJourInterfaceUtilisateur();
        
        setTimeout(() => {
            ApplicationManager.init();
        }, 100);
    },

    seDeconnecter() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            this.currentUser = null;
            localStorage.removeItem('cybergestion_session');
            location.reload();
        }
    },

    aDroit(droit) {
        if (!this.currentUser || !this.users[this.currentUser]) return false;
        return this.users[this.currentUser].droits.includes(droit);
    },

    mettreAJourInterfaceUtilisateur() {
        const userInfo = document.getElementById('user-info');
        const adminSection = document.getElementById('admin-section');
        const configServicesBtn = document.querySelector('.config-services-favicon');
        const gestionUsersBtn = document.querySelector('[onclick="afficherModalGestionUtilisateurs()"]');
        
        if (this.currentUser && userInfo) {
            const userData = this.users[this.currentUser];
            userInfo.textContent = `👤 ${userData.nom} (${this.currentUser})`;
            userInfo.className = `user-badge ${userData.type}`;
            
            if (adminSection) {
                adminSection.style.display = this.aDroit('purge') ? 'block' : 'none';
            }
            
            if (configServicesBtn) {
                configServicesBtn.style.display = this.aDroit('gestion_services') ? 'inline-block' : 'none';
            }
            
            if (gestionUsersBtn) {
                gestionUsersBtn.style.display = this.aDroit('gestion_utilisateurs') ? 'inline-block' : 'none';
            }
        }
    },

    sauvegarderSession() {
        const session = {
            user: this.currentUser,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('cybergestion_session', JSON.stringify(session));
    },

    chargerSession() {
        try {
            const sessionData = localStorage.getItem('cybergestion_session');
            if (!sessionData) return null;
            
            const session = JSON.parse(sessionData);
            if (session.user && this.users[session.user]) {
                return session;
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    afficherModalConnexion() {
        const loginModal = document.getElementById('login-modal');
        const mainApp = document.getElementById('main-app');
        
        if (loginModal) loginModal.style.display = 'flex';
        if (mainApp) mainApp.style.display = 'none';
        
        setTimeout(() => {
            const usernameInput = document.getElementById('login-username');
            if (usernameInput) usernameInput.focus();
        }, 100);
    },

    chargerUtilisateurs() {
        try {
            const usersSauvegardes = localStorage.getItem('cybergestion_utilisateurs');
            if (usersSauvegardes) {
                this.users = JSON.parse(usersSauvegardes);
                console.log('👥 Utilisateurs chargés:', Object.keys(this.users));
            }
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
        }
    },

    sauvegarderUtilisateurs() {
        try {
            localStorage.setItem('cybergestion_utilisateurs', JSON.stringify(this.users));
            console.log('💾 Utilisateurs sauvegardés:', Object.keys(this.users));
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde utilisateurs:', error);
            return false;
        }
    },

    genererPINVendeur() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
};

// ==============================================
// GESTIONNAIRE DE SAUVEGARDE - ARCHITECTURE OPTIMISÉE
// ==============================================

const SauvegardeManager = {
    init() {
        console.log('💾 Gestionnaire de sauvegarde initialisé');
        this.verifierPremiereUtilisation();
    },

    verifierPremiereUtilisation() {
        const sauvegarde = this.chargerSauvegarde();
        
        if (!sauvegarde || !sauvegarde.initialise) {
            console.log('📥 Première utilisation détectée');
            setTimeout(() => {
                this.demanderImportXLS();
            }, 1500);
        } else {
            console.log('✅ Application déjà initialisée - Mode autonome');
        }
    },

    demanderImportXLS() {
        if (confirm('📦 Premier lancement détecté!\n\nVoulez-vous importer le stock depuis le fichier Excel stock_du_jour.xls ?')) {
            this.chargerStockXLSInitial();
        } else {
            this.creerStockTest();
        }
    },

    chargerStockXLSInitial() {
        console.log('📥 Chargement XLS initial...');
        this._chargerStockXLS(true);
    },

    mettreAJourStockDepuisXLS() {
        if (confirm('📥 Remplacer le stock actuel par le fichier XLS ?\n\nLe stock actuel sera complètement remplacé.')) {
            console.log('🔄 Mise à jour XLS manuelle...');
            this._chargerStockXLS(false);
        }
    },

    async _chargerStockXLS(estInitialisation) {
        try {
            console.log('🔄 Tentative de chargement XLS...');
            
            const isFileProtocol = window.location.protocol === 'file:';
            
            if (isFileProtocol) {
                return this._chargerStockXLSParFichier(estInitialisation);
            } else {
                const response = await fetch('stock_du_jour.xls');
                if (!response.ok) throw new Error('Fichier non trouvé');
                
                const data = await response.arrayBuffer();
                return this._traiterFichierXLS(data, estInitialisation);
            }
        } catch (error) {
            console.error('❌ Erreur import XLS:', error);
            this._gererErreurXLS(estInitialisation, error);
        }
    },

   _chargerStockXLSParFichier(estInitialisation) {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xls,.xlsx';
        input.style.display = 'none';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) {
                if (estInitialisation) {
                    this.creerStockTest();
                    resolve();
                } else {
                    reject(new Error('Aucun fichier sélectionné'));
                }
                return;
            }
            
            // Vérifier que c'est bien un fichier Excel
            if (!file.name.match(/\.(xls|xlsx)$/i)) {
                alert('❌ Veuillez sélectionner un fichier Excel (.xls ou .xlsx)');
                reject(new Error('Format de fichier invalide'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this._traiterFichierXLS(e.target.result, estInitialisation);
                    resolve();
                } catch (error) {
                    console.error('❌ Erreur traitement XLS:', error);
                    reject(error);
                }
            };
            reader.onerror = () => {
                reject(new Error('Erreur lecture fichier'));
            };
            reader.readAsArrayBuffer(file);
        };
        
        document.body.appendChild(input);
        input.click();
        setTimeout(() => {
            document.body.removeChild(input);
        }, 1000);
    });
},
    _traiterFichierXLS(data, estInitialisation) {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const stockImport = XLSX.utils.sheet_to_json(firstSheet);
        
        if (stockImport && stockImport.length > 0) {
            stockData = stockImport.map(item => ({
                'DESIGNATION': item.DESIGNATION || '',
                'CODE-BR': item['CODE-BR'] || '',
                'CATEGORIE': item.CATEGORIE || '',
                'QUANTITE': parseInt(item.QUANTITE) || 0,
                'PRIX-U': parseInt(item['PRIX-U']) || 0,
                'REMISE': parseInt(item.REMISE) || 0
            }));
            
            this.sauvegarderDonnees(estInitialisation);
            afficherProduits();
            afficherStock();
            
            const message = estInitialisation ? 
                `✅ Stock initial chargé!\n${stockData.length} produits.` :
                `✅ Stock mis à jour!\n${stockData.length} produits.`;
            
            console.log('✅ Stock importé:', stockData.length, 'produits');
            alert(message);
        } else {
            throw new Error('Fichier vide');
        }
    },

    _gererErreurXLS(estInitialisation, error) {
        if (estInitialisation) {
            alert('❌ Erreur lors de l\'import du fichier Excel. Création d\'un stock test...');
            this.creerStockTest();
        } else {
            if (error.message.includes('CORS') || error.message.includes('file:')) {
                alert('📁 Mode fichier détecté - Sélectionnez manuellement le fichier "stock_du_jour.xls"');
            } else {
                alert('❌ Fichier XLS introuvable pour mise à jour');
            }
        }
    },

    creerStockTest() {
        console.log('🔄 Création stock test...');
        stockData = [
            { 'DESIGNATION': 'Câble USB Type-C', 'CODE-BR': 'CB1001', 'CATEGORIE': 'Informatique', 'QUANTITE': 15, 'PRIX-U': 800, 'REMISE': 0 },
            { 'DESIGNATION': 'Souris Sans Fil', 'CODE-BR': 'CB1002', 'CATEGORIE': 'Informatique', 'QUANTITE': 8, 'PRIX-U': 1200, 'REMISE': 0 },
            { 'DESIGNATION': 'Clé USB 32Go', 'CODE-BR': 'CB1003', 'CATEGORIE': 'Informatique', 'QUANTITE': 20, 'PRIX-U': 600, 'REMISE': 0 },
            { 'DESIGNATION': 'Casque Audio', 'CODE-BR': 'CB1004', 'CATEGORIE': 'Audio', 'QUANTITE': 5, 'PRIX-U': 2500, 'REMISE': 0 },
            { 'DESIGNATION': 'Chargeur Portable', 'CODE-BR': 'CB1005', 'CATEGORIE': 'Mobile', 'QUANTITE': 12, 'PRIX-U': 3500, 'REMISE': 0 }
        ];
        
        this.sauvegarderDonnees(true);
        afficherProduits();
        afficherStock();
        
        alert('✅ Stock test créé avec succès!\n5 produits de démonstration ajoutés.');
    },

    sauvegarderDonnees(estInitialisation = false) {
        try {
            const donnees = {
                stockData: stockData || [],
                historiqueVentes: historiqueVentes || [],
                historiqueServices: historiqueServices || [],
                panierServices: panierServices || [],
                servicesConfig: servicesConfig || {},
                theme: ThemeManager.getThemeActuel(),
                dateSauvegarde: new Date().toISOString(),
                initialise: estInitialisation || this.estInitialise()
            };
            
            localStorage.setItem('cybergestion_donnees', JSON.stringify(donnees));
            console.log('💾 Données sauvegardées');
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            alert('❌ Erreur lors de la sauvegarde des données');
            return false;
        }
    },

    estInitialise() {
        try {
            const sauvegarde = localStorage.getItem('cybergestion_donnees');
            if (sauvegarde) {
                const donnees = JSON.parse(sauvegarde);
                return donnees.initialise || false;
            }
        } catch (error) {
            console.error('Erreur vérification initialisation:', error);
        }
        return false;
    },

    chargerSauvegarde() {
        try {
            const sauvegarde = localStorage.getItem('cybergestion_donnees');
            if (sauvegarde) {
                return JSON.parse(sauvegarde);
            }
        } catch (error) {
            console.error('❌ Erreur chargement sauvegarde:', error);
        }
        return null;
    },

    chargerDonnees() {
        try {
            const sauvegarde = localStorage.getItem('cybergestion_donnees');
            if (sauvegarde) {
                const donnees = JSON.parse(sauvegarde);
                
                stockData = donnees.stockData || [];
                historiqueVentes = donnees.historiqueVentes || [];
                historiqueServices = donnees.historiqueServices || [];
                panierServices = donnees.panierServices || [];
                servicesConfig = donnees.servicesConfig || this.getServicesConfigParDefaut();
                
                console.log('📂 Données chargées:', {
                    stock: stockData.length,
                    ventes: historiqueVentes.length,
                    services: historiqueServices.length
                });
                
                return true;
            }
        } catch (error) {
            console.error('❌ Erreur chargement données:', error);
        }
        
        this.initialiserDonneesParDefaut();
        return false;
    },

    initialiserDonneesParDefaut() {
        stockData = [];
        historiqueVentes = [];
        historiqueServices = [];
        panierServices = [];
        servicesConfig = this.getServicesConfigParDefaut();
    },

    getServicesConfigParDefaut() {
        return {
            impression: [
                { nom: "Noir et Blanc A4", prix: 50 },
                { nom: "Couleur A4", prix: 100 }
            ],
            photocopie: [
                { nom: "Noir et Blanc A4", prix: 25 },
                { nom: "Couleur A4", prix: 50 }
            ],
            inscription: [
                { nom: "Inscription universitaire", prix: 2000 }
            ],
            web: [
                { nom: "Recherche internet (1h)", prix: 1000 }
            ],
            scan: [
                { nom: "Scan document", prix: 50 }
            ],
            saisie: [
                { nom: "Saisie texte (page)", prix: 500 }
            ],
            informatique: [
                { nom: "Formatage PC", prix: 5000 }
            ],
            autre: [
                { nom: "Service personnalisé", prix: 0 }
            ]
        };
    },

    exporterSauvegarde() {
        if (this.sauvegarderDonnees()) {
            const donnees = localStorage.getItem('cybergestion_donnees');
            const blob = new Blob([donnees], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sauvegarde_cybergestion_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('✅ Sauvegarde exportée avec succès!');
        } else {
            alert('❌ Erreur lors de la sauvegarde');
        }
    },

    importerSauvegarde(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const donnees = JSON.parse(e.target.result);
                
                if (confirm('📥 Restaurer cette sauvegarde? Cela remplacera toutes les données actuelles.')) {
                    donnees.initialise = true;
                    localStorage.setItem('cybergestion_donnees', JSON.stringify(donnees));
                    alert('✅ Sauvegarde restaurée! Redémarrage...');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
            } catch (error) {
                console.error('❌ Erreur import sauvegarde:', error);
                alert('❌ Fichier de sauvegarde invalide');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    purgerCompletement() {
        if (SessionManager.aDroit('purge')) {
            if (confirm('🗑️ ÊTES-VOUS ABSOLUMENT SÛR ?\n\nCette action va :\n• Supprimer TOUTES les données\n• Réinitialiser le stock\n• Effacer l\'historique complet\n• Cette action est IRREVERSIBLE !')) {
                localStorage.removeItem('cybergestion_donnees');
                localStorage.removeItem('cybergestion_session');
                localStorage.removeItem('cybergestion_utilisateurs');
                alert('✅ Toutes les données ont été purgées. Redémarrage...');
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }
        } else {
            alert('❌ Accès refusé. Droits administrateur requis.');
        }
    }
};

// ==============================================
// GESTIONNAIRE DE THÈME
// ==============================================

const ThemeManager = {
    init() {
        console.log('🎨 Gestionnaire de thème initialisé');
        this.chargerTheme();
    },

    chargerTheme() {
        const themeSauvegarde = localStorage.getItem('cybergestion_theme') || 'clair';
        this.changerTheme(themeSauvegarde);
    },

    changerTheme(theme) {
        const themeLight = document.getElementById('theme-light');
        const themeDark = document.getElementById('theme-dark');
        const themeLightBtn = document.getElementById('theme-light-btn');
        const themeDarkBtn = document.getElementById('theme-dark-btn');
        
        if (theme === 'sombre') {
            document.documentElement.setAttribute('data-theme', 'sombre');
            if (themeLight) themeLight.classList.remove('active');
            if (themeDark) themeDark.classList.add('active');
            if (themeLightBtn) themeLightBtn.classList.remove('active');
            if (themeDarkBtn) themeDarkBtn.classList.add('active');
        } else {
            document.documentElement.setAttribute('data-theme', 'clair');
            if (themeDark) themeDark.classList.remove('active');
            if (themeLight) themeLight.classList.add('active');
            if (themeDarkBtn) themeDarkBtn.classList.remove('active');
            if (themeLightBtn) themeLightBtn.classList.add('active');
        }
        
        localStorage.setItem('cybergestion_theme', theme);
        console.log('🎨 Thème changé:', theme);
    },

    getThemeActuel() {
        return localStorage.getItem('cybergestion_theme') || 'clair';
    }
};

// ==============================================
// GESTION PLEIN ÉCRAN
// ==============================================

const PleinEcranManager = {
    init() {
        this.ajouterBoutonPleinEcran();
    },

    ajouterBoutonPleinEcran() {
        const headerRight = document.querySelector('.header-right');
        if (headerRight && !document.querySelector('.plein-ecran-favicon')) {
            headerRight.insertAdjacentHTML('afterbegin', `
                <span class="plein-ecran-favicon parametres-favicon" onclick="PleinEcranManager.basculerPleinEcran()" title="Plein écran">📺</span>
            `);
        }
    },

    basculerPleinEcran() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Erreur plein écran:', err);
                alert('❌ Impossible d\'activer le mode plein écran');
            });
        } else {
            document.exitFullscreen();
        }
    },

    estEnPleinEcran() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }
};

// ==============================================
// GESTIONNAIRE PRINCIPAL
// ==============================================

const ApplicationManager = {
    init() {
        console.log('🚀 Application CyberGestion initialisée');
        
        ThemeManager.init();
        PleinEcranManager.init();
        SauvegardeManager.init();
        
        this.chargerDonneesApplication();
        this.configurerInterface();
        this.demarrerServices();
        this.mettreAJourAffichageInitial();
    },

    chargerDonneesApplication() {
        console.log('📂 Chargement des données...');
        if (!SauvegardeManager.chargerDonnees()) {
            console.log('📝 Première utilisation - configuration initiale');
        }
    },

    configurerInterface() {
        console.log('⚙️ Configuration de l\'interface...');
        
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', function() {
                changerOnglet(this.dataset.tab);
            });
        });

        document.querySelectorAll('.subtab-button').forEach(button => {
            button.addEventListener('click', function() {
                changerSousOnglet(this.dataset.subtab);
            });
        });

        this.configurerRecherche();
        this.configurerRechercheCodeBarre();
        this.ajouterBoutonConfigServices();

        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                importerFichierStock(e);
            });
        }

        this.initialiserVignettesServices();
        this.configurerAjoutClavier();
        configurerValidationClavierComplete();
	    configurerAideRemiseGlobale();
		    // Initialiser la recherche des produits pour échange
    const rechercheEchange = document.getElementById('recherche-echange-produit');
    if (rechercheEchange) {
        rechercheEchange.addEventListener('input', afficherProduitsPourEchange);
    }
        
        setTimeout(() => {
            const searchInput = document.getElementById('search-product');
            if (searchInput) searchInput.focus();
        }, 500);
    },

    configurerRecherche() {
        const searchInput = document.getElementById('search-product');
        if (!searchInput) return;
        
        let timerRecherche = null;
        
        searchInput.addEventListener('input', function(e) {
            clearTimeout(timerRecherche);
            const recherche = this.value.trim();
            
            if (recherche === '') {
                afficherProduits();
                return;
            }
            
            timerRecherche = setTimeout(() => {
                executerRecherche(recherche, false);
            }, 300);
        });

        searchInput.addEventListener('keydown', function(e) {
            clearTimeout(timerRecherche);
            
            if (e.key === 'Enter') {
                e.preventDefault();
                const recherche = this.value.trim();
                if (recherche) {
                    executerRecherche(recherche, true);
                }
            } else if (e.key === 'Escape') {
                effacerRecherche();
            }
        });
    },

    configurerRechercheCodeBarre() {
        const searchInput = document.getElementById('search-product');
        if (!searchInput) return;
        
        let timerCodeBarre = null;
        let bufferCodeBarre = '';
        let derniereToucheTime = 0;
        
        searchInput.addEventListener('keydown', function(e) {
            const maintenant = new Date().getTime();
            const tempsEcoule = maintenant - derniereToucheTime;
            
            if (tempsEcoule > 150) {
                bufferCodeBarre = '';
            }
            
            if (e.key === 'Enter') {
                e.preventDefault();
                if (bufferCodeBarre.length >= 3) {
                    executerRechercheCodeBarre(bufferCodeBarre);
                    bufferCodeBarre = '';
                }
                return;
            }
            
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                bufferCodeBarre += e.key;
            }
            
            derniereToucheTime = maintenant;
        });
        
        searchInput.addEventListener('input', function(e) {
            const valeur = this.value.trim();
            
            clearTimeout(timerCodeBarre);
            
            if (valeur.length >= 3) {
                timerCodeBarre = setTimeout(() => {
                    executerRechercheCodeBarre(valeur);
                }, 50);
            }
        });
    },

    ajouterBoutonConfigServices() {
        if (SessionManager.aDroit('gestion_services')) {
            const headerRight = document.querySelector('.header-right');
            if (headerRight) {
                const existeDeja = document.querySelector('.config-services-favicon');
                if (!existeDeja) {
                    headerRight.insertAdjacentHTML('afterbegin', `
                        <span class="config-services-favicon parametres-favicon" onclick="afficherModalConfigServices()" title="Configurer les services">🔧</span>
                    `);
                }
            }
        }
    },

    initialiserVignettesServices() {
        const serviceCards = document.querySelectorAll('.service-card');
        
        serviceCards.forEach(card => {
            let clickCount = 0;
            let timer = null;
            
            card.addEventListener('click', function(e) {
                clickCount++;
                
                if (clickCount === 1) {
                    timer = setTimeout(() => {
                        const typeService = this.dataset.type;
                        activerServicePourAjustement(typeService);
                        clickCount = 0;
                    }, 300);
                } else if (clickCount === 2) {
                    clearTimeout(timer);
                    const typeService = this.dataset.type;
                    const service = servicesConfig[typeService]?.[0];
                    
                    if (service) {
                        const serviceExistant = panierServices.find(s => 
                            s.type === typeService && s.nom === service.nom
                        );
                        
                        if (serviceExistant) {
                            serviceExistant.quantite += 1;
                            serviceExistant.montantFinal = serviceExistant.montant * serviceExistant.quantite;
                        } else {
                            panierServices.push({
                                type: typeService,
                                nom: service.nom,
                                description: service.nom,
                                montant: service.prix,
                                montantFinal: service.prix,
                                quantite: 1,
                                client: '',
                                statutPaiement: 'paye',
                                date: new Date().toISOString(),
                                remise: 0,
                                typeRemise: 'DA'
                            });
                        }
                        
                        mettreAJourPanierServices();
                        
                        this.style.transform = 'scale(0.95)';
                        this.style.background = 'var(--success-color)';
                        this.style.color = 'white';
                        
                        setTimeout(() => {
                            this.style.transform = '';
                            this.style.background = '';
                            this.style.color = '';
                        }, 300);
                    }
                    clickCount = 0;
                }
            });
        });
    },

    configurerAjoutClavier() {
        const montantInput = document.getElementById('service-amount');
        const descriptionInput = document.getElementById('service-description');
        
        if (montantInput) {
            montantInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    ajouterServiceAuPanier();
                }
            });
        }
        
        if (descriptionInput) {
            descriptionInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('service-amount').focus();
                }
            });
        }
    },

    demarrerServices() {
        actualiserDateHeure();
        setInterval(actualiserDateHeure, 60000);
    },

    mettreAJourAffichageInitial() {
        console.log('🔄 Mise à jour affichage initial');
        console.log('📊 Données chargées:', {
            stock: stockData.length,
            ventes: historiqueVentes.length,
            services: historiqueServices.length
        });
        
        afficherProduits();
        afficherStock();
        mettreAJourPanier();
        mettreAJourPanierServices();
        afficherHistorique();
        initialiserDatesRecap();
        
        // FORCER le recalcul du récapitulatif avec un délai
        setTimeout(() => {
            console.log('🔄 Forçage génération récapitulatif initial');
            genererRecapitulatif();
        }, 1000);
    }
};

// ==============================================
// FONCTIONS GLOBALES CORRIGÉES
// ==============================================

function seDeconnecter() {
    SessionManager.seDeconnecter();
}

function fermerApplication() {
    if (confirm('Fermer CyberGestion ?\n\nVos données sont sauvegardées.')) {
        SauvegardeManager.sauvegarderDonnees();
        
        // Tentative de fermeture avec gestion d'erreur
        try {
            // Pour les PWA et fenêtres ouvertes par script
            if (window.matchMedia('(display-mode: standalone)').matches || 
                window.opener !== null || 
                window.history.length === 1) {
                window.close();
            } else {
                // Pour les onglets normaux
                window.location.href = 'about:blank';
                setTimeout(() => {
                    if (!window.closed) {
                        alert('✅ Données sauvegardées ! Vous pouvez maintenant fermer cet onglet manuellement.');
                    }
                }, 100);
            }
        } catch (error) {
            console.log('Fermeture automatique non disponible');
            alert('✅ Données sauvegardées ! Fermez cet onglet manuellement (Ctrl+W ou Cmd+W).');
        }
    }
}

function ouvrirParametres() {
    const modal = document.getElementById('parametres-modal');
    const adminSection = document.getElementById('admin-section');
    
    if (modal) modal.style.display = 'flex';
    if (adminSection) {
        adminSection.style.display = SessionManager.aDroit('purge') ? 'block' : 'none';
    }
}

function fermerParametres() {
    const modal = document.getElementById('parametres-modal');
    if (modal) modal.style.display = 'none';
}

function purgerCompletement() {
    SauvegardeManager.purgerCompletement();
}

function changerTheme(theme) {
    ThemeManager.changerTheme(theme);
}

function reinitialiserMotDePasseAdmin() {
    if (SessionManager.aDroit('gestion_utilisateurs')) {
        if (confirm('🔑 Réinitialiser le mot de passe admin par défaut?')) {
            SessionManager.users.admin.password = 'admin123';
            SessionManager.sauvegarderUtilisateurs();
            alert('✅ Mot de passe admin réinitialisé à "admin123"');
        }
    } else {
        alert('❌ Droits administrateur requis');
    }
}

function basculerPleinEcran() {
    PleinEcranManager.basculerPleinEcran();
}

function mettreAJourStockDepuisXLS() {
    if (SessionManager.aDroit('gestion_stock')) {
        SauvegardeManager.mettreAJourStockDepuisXLS();
    } else {
        alert('❌ Droits administrateur requis');
    }
}

function purgerCacheComplet() {
    if (SessionManager.aDroit('purge')) {
        if (confirm('🗑️ Purger COMPLÈTEMENT le cache PWA ?\n\nCette action va :\n• Supprimer tous les caches navigateur\n• Forcer le rechargement complet\n• Conserver les données utilisateur')) {
            
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        console.log('🗑️ Suppression cache:', name);
                        caches.delete(name);
                    });
                });
            }
            
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => {
                        console.log('🚫 Désenregistrement Service Worker');
                        registration.unregister();
                    });
                });
            }
            
            localStorage.setItem('cybergestion_force_reload', 'true');
            alert('✅ Cache purgé! Redémarrage...');
            setTimeout(() => {
                window.location.href = window.location.pathname + '?forceReload=' + Date.now();
            }, 1000);
        }
    } else {
        alert('❌ Droits administrateur requis');
    }
}

// ==============================================
// GESTION COMPLÈTE UTILISATEURS - CORRIGÉE
// ==============================================

function afficherModalGestionUtilisateurs() {
    if (!SessionManager.aDroit('gestion_utilisateurs')) {
        alert('❌ Droits administrateur requis');
        return;
    }
    
    const modal = document.getElementById('gestion-utilisateurs-modal');
    const liste = document.getElementById('liste-utilisateurs');
    
    if (modal && liste) {
        let html = '<h3>👥 Liste des Utilisateurs</h3>';
        
        Object.entries(SessionManager.users).forEach(([username, userData]) => {
            const estUtilisateurActuel = username === SessionManager.currentUser;
            const estAdminParDefaut = username === 'admin';
            
            html += `
                <div class="user-item" style="padding: 12px; border-bottom: 1px solid var(--border-color); margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${userData.nom}</strong> 
                            <span style="color: var(--text-secondary);">(${username})</span><br>
                            <small style="color: var(--text-secondary);">
                                Type: ${userData.type} | 
                                Droits: ${userData.droits?.length || 0}
                                ${estUtilisateurActuel ? ' | 🟢 Connecté' : ''}
                            </small>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn-warning" onclick="modifierUtilisateur('${username}')" 
                                    ${estAdminParDefaut ? 'disabled title="Admin par défaut non modifiable"' : ''}>
                                ✏️ Modifier
                            </button>
                            <button class="btn-danger" onclick="supprimerUtilisateur('${username}')" 
                                    ${estUtilisateurActuel || estAdminParDefaut ? 'disabled title="Impossible de supprimer"' : ''}>
                                ❌ Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        liste.innerHTML = html;
        modal.style.display = 'flex';
    }
}

function modifierUtilisateur(username) {
    if (username === 'admin') {
        alert('❌ L\'utilisateur admin par défaut ne peut pas être modifié');
        return;
    }
    
    const user = SessionManager.users[username];
    if (!user) return;
    
    const nouveauNom = prompt(`Modifier le nom complet pour ${username}:`, user.nom);
    if (nouveauNom === null) return;
    
    const nouveauType = prompt(`Type d'utilisateur (admin/vendeur) pour ${username}:`, user.type);
    if (nouveauType === null) return;
    
    if (nouveauType !== 'admin' && nouveauType !== 'vendeur') {
        alert('❌ Type invalide. Doit être "admin" ou "vendeur"');
        return;
    }
    
    const nouveauMotDePasse = prompt('Nouveau mot de passe (laisser vide pour ne pas changer):');
    
    SessionManager.users[username].nom = nouveauNom.trim();
    SessionManager.users[username].type = nouveauType;
    
    if (nouveauType === 'admin') {
        SessionManager.users[username].droits = [
            'purge', 'parametres', 'export', 'reinitialisation', 'gestion_utilisateurs', 
            'annuler_vente', 'restaurer_vente', 'modifier_vente', 'gestion_stock', 
            'gestion_services', 'purge_recapitulatif'
        ];
    } else {
        SessionManager.users[username].droits = ['ventes', 'services', 'consultation'];
    }
    
    if (nouveauMotDePasse && nouveauMotDePasse.trim() !== '') {
        SessionManager.users[username].password = nouveauMotDePasse.trim();
    }
    
    SessionManager.sauvegarderUtilisateurs();
    alert('✅ Utilisateur modifié avec succès!');
    afficherModalGestionUtilisateurs();
}

function supprimerUtilisateur(username) {
    if (username === SessionManager.currentUser) {
        alert('❌ Impossible de supprimer l\'utilisateur actuellement connecté');
        return;
    }
    
    if (username === 'admin') {
        alert('❌ L\'utilisateur admin par défaut ne peut pas être supprimé');
        return;
    }
    
    if (confirm(`🗑️ Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?\nCette action est irréversible!`)) {
        delete SessionManager.users[username];
        SessionManager.sauvegarderUtilisateurs();
        alert('✅ Utilisateur supprimé avec succès!');
        afficherModalGestionUtilisateurs();
    }
}

function ajouterUtilisateur() {
    const username = prompt('Nom d\'utilisateur:');
    if (!username || username.trim() === '') return;
    
    if (SessionManager.users[username]) {
        alert('❌ Cet utilisateur existe déjà');
        return;
    }
    
    const password = prompt('Mot de passe:');
    if (!password || password.trim() === '') {
        alert('❌ Le mot de passe est obligatoire');
        return;
    }
    
    const nom = prompt('Nom complet:');
    if (!nom || nom.trim() === '') {
        alert('❌ Le nom complet est obligatoire');
        return;
    }
    
    const type = prompt('Type (admin/vendeur):');
    if (!type || (type !== 'admin' && type !== 'vendeur')) {
        alert('❌ Type invalide. Doit être "admin" ou "vendeur"');
        return;
    }
    
    const droits = type === 'admin' ? [
        'purge', 'parametres', 'export', 'reinitialisation', 'gestion_utilisateurs', 
        'annuler_vente', 'restaurer_vente', 'modifier_vente', 'gestion_stock', 
        'gestion_services', 'purge_recapitulatif'
    ] : ['ventes', 'services', 'consultation'];
    
    SessionManager.users[username] = {
        password: password.trim(),
        nom: nom.trim(),
        type: type,
        droits: droits
    };
    
    SessionManager.sauvegarderUtilisateurs();
    alert(`✅ Utilisateur "${username}" créé avec succès!`);
    afficherModalGestionUtilisateurs();
}

function fermerModalGestionUtilisateurs() {
    const modal = document.getElementById('gestion-utilisateurs-modal');
    if (modal) modal.style.display = 'none';
}

// ==============================================
// FONCTIONS DE GESTION DU MODAL DE CHOIX D'EXPORT
// ==============================================

function ouvrirChoixExport() {
    console.log('📊 Ouverture modal choix export...');
    
    // Réinitialiser la sélection
    const radioInformatif = document.querySelector('input[value="informatif"]');
    if (radioInformatif) radioInformatif.checked = true;
    
    const modal = document.getElementById('choix-export-modal');
    if (modal) modal.style.display = 'flex';
    
    // Ajouter les styles interactifs
    setTimeout(() => {
        document.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', function() {
                const radio = this.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
                
                // Mettre à jour le style visuel
                document.querySelectorAll('.export-option').forEach(opt => {
                    opt.style.borderColor = 'var(--border-color)';
                    opt.style.background = 'var(--bg-secondary)';
                    opt.style.boxShadow = 'none';
                });
                
                this.style.borderColor = 'var(--accent-color)';
                this.style.background = 'rgba(52, 152, 219, 0.1)';
                this.style.boxShadow = '0 0 0 2px var(--accent-color)';
            });
        });
    }, 100);
}

function fermerChoixExport() {
    console.log('❌ Fermeture modal choix export');
    const modal = document.getElementById('choix-export-modal');
    if (modal) modal.style.display = 'none';
    // NE PAS remettre typeExportChoisi à null ici - la variable est utilisée dans lancerExportRecapitulatif()
}

function confirmerChoixExport() {
    const selectedRadio = document.querySelector('input[name="export-type"]:checked');
    
    if (!selectedRadio) {
        alert('❌ Veuillez sélectionner un type d\'export');
        return;
    }
    
    typeExportChoisi = selectedRadio.value;
    console.log('✅ Type d\'export choisi:', typeExportChoisi);
    
    fermerChoixExport();
    lancerExportRecapitulatif();
}

function lancerExportRecapitulatif() {
if (typeof XLSX === 'undefined') {
    alert('❌ Bibliothèque Excel non chargée.\nVérifiez la connexion ou ré-installez l\'appli.');
    return;
  }
    if (!typeExportChoisi) {
        console.error('❌ Aucun type d\'export sélectionné');
        return;
    }

    try {
        console.log(`🚀 Lancement export ${typeExportChoisi}...`);
        
        const periode = document.getElementById('recap-periode')?.value || 'aujourdhui';
        let dateDebut, dateFin;
        
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        
        // Calcul de période (commun aux deux exports)
        switch(periode) {
            case 'aujourdhui':
                dateDebut = new Date(aujourdhui);
                dateFin = new Date(aujourdhui);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'hier':
                dateDebut = new Date(aujourdhui);
                dateDebut.setDate(aujourdhui.getDate() - 1);
                dateFin = new Date(dateDebut);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'semaine':
                dateDebut = new Date(aujourdhui);
                dateDebut.setDate(aujourdhui.getDate() - aujourdhui.getDay());
                dateFin = new Date(aujourdhui);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'mois':
                dateDebut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
                dateFin = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'personnalise':
                const debutInput = document.getElementById('recap-date-debut')?.value;
                const finInput = document.getElementById('recap-date-fin')?.value;
                dateDebut = debutInput ? new Date(debutInput) : new Date(aujourdhui);
                dateFin = finInput ? new Date(finInput) : new Date(aujourdhui);
                dateFin.setHours(23, 59, 59, 999);
                break;
            default:
                dateDebut = new Date(aujourdhui);
                dateFin = new Date(aujourdhui);
                dateFin.setHours(23, 59, 59, 999);
        }

        // Filtrer les données (commun aux deux exports)
        const ventesFiltrees = historiqueVentes.filter(vente => {
            if (!vente || vente.annule) return false;
            try {
                const dateVente = new Date(vente.date);
                return dateVente >= dateDebut && dateVente <= dateFin;
            } catch (error) {
                return false;
            }
        });

        const servicesFiltrees = historiqueServices.filter(service => {
            if (!service) return false;
            try {
                const dateService = new Date(service.dateFinalisation || service.date);
                return dateService >= dateDebut && dateService <= dateFin;
            } catch (error) {
                return false;
            }
        });

        if (ventesFiltrees.length === 0 && servicesFiltrees.length === 0) {
            alert('❌ Aucune donnée à exporter pour la période sélectionnée');
            return;
        }

        // Calcul des totaux (commun aux deux exports)
        let ventesPayees = 0, ventesInstance = 0, ventesCredit = 0, totalGeneral = 0;
        
        ventesFiltrees.forEach(vente => {
            const montant = vente.total || 0;
            const statut = vente.statutPaiement;
            
            if (statut === 'paye') ventesPayees += montant;
            else if (statut === 'instance') ventesInstance += montant;
            else if (statut === 'credit') ventesCredit += montant;
            
            totalGeneral += montant;
        });

        servicesFiltrees.forEach(service => {
            const montant = service.montant || service.montantFinal || 0;
            const statut = service.statutPaiement;
            
            if (statut === 'paye') ventesPayees += montant;
            else if (statut === 'instance') ventesInstance += montant;
            else if (statut === 'credit') ventesCredit += montant;
            
            totalGeneral += montant;
        });

        // GÉNÉRATION SELON LE CHOIX
        if (typeExportChoisi === 'informatif') {
            exporterInformatif(ventesFiltrees, servicesFiltrees, periode, dateDebut, dateFin, totalGeneral, ventesPayees, ventesInstance, ventesCredit);
        } else {
            exporterDetaille(ventesFiltrees, servicesFiltrees, periode, dateDebut, dateFin, totalGeneral, ventesPayees, ventesInstance, ventesCredit);
        }

    } catch (error) {
        console.error('❌ Erreur export récapitulatif:', error);
        alert('❌ Erreur lors de l\'export du récapitulatif\n\nDétails: ' + error.message);
    } finally {
        typeExportChoisi = null;
    }
}

// ==============================================
// SOUS-FONCTION : EXPORT INFORMATIF - CORRIGÉE
// ==============================================

function exporterInformatif(ventesFiltrees, servicesFiltrees, periode, dateDebut, dateFin, totalGeneral, ventesPayees, ventesInstance, ventesCredit) {
    try {
        console.log('📊 Génération export informatif...');
        
        // Vérifier que XLSX est disponible
        if (typeof XLSX === 'undefined') {
            throw new Error('Bibliothèque XLSX non chargée');
        }

        const donneesExport = [];

        // En-tête avec les totaux
        donneesExport.push(['RÉCAPITULATIF CYBERGESTION - VUE SYNTHÉTIQUE']);
        donneesExport.push([`Période: ${periode}`]);
        donneesExport.push([`Du: ${dateDebut.toLocaleDateString('fr-FR')} Au: ${dateFin.toLocaleDateString('fr-FR')}`]);
        donneesExport.push(['Exporté le:', new Date().toLocaleString('fr-FR')]);
        donneesExport.push(['']);
        donneesExport.push(['SYNTHÈSE DES TOTAUX']);
        donneesExport.push(['Ventes Payées:', `${ventesPayees} DA`]);
        donneesExport.push(['Ventes en Instance:', `${ventesInstance} DA`]);
        donneesExport.push(['Ventes Crédit:', `${ventesCredit} DA`]);
        donneesExport.push(['TOTAL GÉNÉRAL:', `${totalGeneral} DA`]);
        donneesExport.push(['']);
        donneesExport.push(['STATISTIQUES']);
        donneesExport.push(['Nombre de ventes:', ventesFiltrees.length]);
        donneesExport.push(['Nombre de services:', servicesFiltrees.length]);
        donneesExport.push(['Total transactions:', ventesFiltrees.length + servicesFiltrees.length]);
        donneesExport.push(['']);
        donneesExport.push(['DÉTAIL DES TRANSACTIONS']);
        donneesExport.push(['Date', 'Type', 'Description', 'Montant (DA)', 'Client', 'Statut']);

        // Transactions combinées triées par date
        const toutesTransactions = [
            ...ventesFiltrees.map(v => ({ ...v, type: 'VENTE' })),
            ...servicesFiltrees.map(s => ({ ...s, type: 'SERVICE' }))
        ].sort((a, b) => new Date(a.date || a.dateFinalisation) - new Date(b.date || b.dateFinalisation));

        toutesTransactions.forEach(transaction => {
            const isVente = transaction.type === 'VENTE';
            
            let description = '';
            let montant = 0;
            
            if (isVente) {
                description = `${transaction.produits?.length || 0} produit(s)`;
                montant = transaction.total || 0;
            } else {
                description = transaction.description || transaction.nom || 'Service';
                montant = transaction.montant || transaction.montantFinal || 0;
            }
            
            donneesExport.push([
                new Date(transaction.date || transaction.dateFinalisation).toLocaleString('fr-FR'),
                transaction.type,
                description,
                montant,
                transaction.client || '-',
                transaction.statutPaiement?.toUpperCase() || 'INCONNU'
            ]);
        });

        // Créer le fichier Excel
        const ws = XLSX.utils.aoa_to_sheet(donneesExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Récapitulatif");

        // Ajuster les largeurs de colonnes
        const colWidths = [
            { wch: 20 }, { wch: 10 }, { wch: 30 }, 
            { wch: 15 }, { wch: 20 }, { wch: 12 }
        ];
        ws['!cols'] = colWidths;

        // Générer le nom du fichier
        const dateExport = new Date().toISOString().split('T')[0];
        const nomFichier = `recap_synthese_${periode}_${dateExport}.xlsx`;

        // Exporter
        XLSX.writeFile(wb, nomFichier);
        
        console.log('✅ Export informatif réussi');
        
        alert(`✅ Export synthétique généré !\n\n📁 Fichier: ${nomFichier}\n\nContenu:\n• Totaux et statistiques\n• Liste des transactions\n• Format simple et lisible`);

    } catch (error) {
        console.error('❌ Erreur export informatif:', error);
        throw new Error('Export informatif: ' + error.message);
    }
}

// ==============================================
// SOUS-FONCTION : EXPORT DÉTAILLÉ - CORRIGÉE
// ==============================================

function exporterDetaille(ventesFiltrees, servicesFiltrees, periode, dateDebut, dateFin, totalGeneral, ventesPayees, ventesInstance, ventesCredit) {
    try {
        console.log('📋 Génération export détaillé...');
        
        // Vérifier que XLSX est disponible
        if (typeof XLSX === 'undefined') {
            throw new Error('Bibliothèque XLSX non chargée');
        }

        const wb = XLSX.utils.book_new();

        // === ONGLET 1: SYNTHÈSE ===
        const donneesSynthese = [];
        donneesSynthese.push(['RÉCAPITULATIF CYBERGESTION - SYNTHÈSE DÉTAILLÉE']);
        donneesSynthese.push([`Période: ${periode}`]);
        donneesSynthese.push([`Du: ${dateDebut.toLocaleDateString('fr-FR')} Au: ${dateFin.toLocaleDateString('fr-FR')}`]);
        donneesSynthese.push(['Exporté le:', new Date().toLocaleString('fr-FR')]);
        donneesSynthese.push(['']);
        
        // Totaux détaillés
        donneesSynthese.push(['SYNTHÈSE FINANCIÈRE DÉTAILLÉE']);
        donneesSynthese.push(['Catégorie', 'Nombre', 'Montant Total', 'Pourcentage']);
        donneesSynthese.push(['Ventes Payées', ventesFiltrees.filter(v => v.statutPaiement === 'paye').length, `${ventesPayees} DA`, `${totalGeneral > 0 ? ((ventesPayees/totalGeneral)*100).toFixed(1) : 0}%`]);
        donneesSynthese.push(['Ventes Instance', ventesFiltrees.filter(v => v.statutPaiement === 'instance').length, `${ventesInstance} DA`, `${totalGeneral > 0 ? ((ventesInstance/totalGeneral)*100).toFixed(1) : 0}%`]);
        donneesSynthese.push(['Ventes Crédit', ventesFiltrees.filter(v => v.statutPaiement === 'credit').length, `${ventesCredit} DA`, `${totalGeneral > 0 ? ((ventesCredit/totalGeneral)*100).toFixed(1) : 0}%`]);
        donneesSynthese.push(['TOTAL GÉNÉRAL', ventesFiltrees.length + servicesFiltrees.length, `${totalGeneral} DA`, '100%']);
        donneesSynthese.push(['']);
        
        // Statistiques avancées
        donneesSynthese.push(['STATISTIQUES AVANCÉES']);
        donneesSynthese.push(['Moyenne par vente:', `${ventesFiltrees.length > 0 ? (ventesFiltrees.reduce((sum, v) => sum + (v.total || 0), 0) / ventesFiltrees.length).toFixed(0) : 0} DA`]);
        donneesSynthese.push(['Moyenne par service:', `${servicesFiltrees.length > 0 ? (servicesFiltrees.reduce((sum, s) => sum + (s.montant || s.montantFinal || 0), 0) / servicesFiltrees.length).toFixed(0) : 0} DA`]);
        
        const maxVente = Math.max(...ventesFiltrees.map(v => v.total || 0));
        const maxService = Math.max(...servicesFiltrees.map(s => s.montant || s.montantFinal || 0));
        donneesSynthese.push(['Transaction la plus élevée:', `${Math.max(maxVente, maxService)} DA`]);
        
        const wsSynthese = XLSX.utils.aoa_to_sheet(donneesSynthese);
        XLSX.utils.book_append_sheet(wb, wsSynthese, "📊 Synthèse");

       // =========================================================
// 1)  ONGLET « Ventes détaillées »  (produit par produit)
// =========================================================
if (ventesFiltrees.length) {
    const donneesVentes = [];
    donneesVentes.push(['VENTES DÉTAILLÉES ‑ PRODUIT PAR PRODUIT']);
    donneesVentes.push([
        'Date', 'ID vente', 'Désignation', 'Code barre', 'Qté', 'PU (DA)',
        'Total ligne (DA)', 'Remise', 'Client', 'Statut', 'Vendeur'
    ]);
    ventesFiltrees.forEach(v => {
        // en-tête de la vente
        donneesVentes.push([
            new Date(v.date).toLocaleString('fr-FR'),
            v.id || '—',
            `Vente n°${v.id} (${v.produits?.length || 0} article(s)`,
            '', '', '', v.total || 0,
            '', v.client || '—',
            v.statutPaiement?.toUpperCase() || 'INCONNU',
            v.utilisateur || '—'
        ]);
        // chaque ligne produit
        (v.produits || []).forEach(p => {
            donneesVentes.push([
                '', '',  // date & ID vides
                p.designation || 'Produit',
                p.code || '—',
                p.quantite || 0,
                p.prix || 0,
                (p.quantite || 0) * (p.prix || 0),
                p.remise ? `${p.remise} ${p.typeRemise}` : '—',
                '', '', ''  // client, statut, vendeur vides
            ]);
        });
        donneesVentes.push([]); // ligne vide entre les ventes
    });
    const wsV = XLSX.utils.aoa_to_sheet(donneesVentes);
    XLSX.utils.book_append_sheet(wb, wsV, '🛒 Ventes détaillées');
}

        // === ONGLET 3: SERVICES DÉTAILLÉS ===
        if (servicesFiltrees.length > 0) {
            const donneesServices = [];
            donneesServices.push(['SERVICES DÉTAILLÉS']);
            donneesServices.push(['Date', 'Type', 'Service', 'Description', 'Quantité', 'Montant Unitaire', 'Montant Total', 'Client', 'Statut', 'Vendeur']);
            
            servicesFiltrees.forEach(service => {
                donneesServices.push([
                    new Date(service.dateFinalisation || service.date).toLocaleString('fr-FR'),
                    service.type?.toUpperCase() || 'AUTRE',
                    service.nom || 'Service',
                    service.description || '-',
                    service.quantite || 1,
                    service.montant || 0,
                    service.montantFinal || service.montant || 0,
                    service.client || '-',
                    service.statutPaiement?.toUpperCase() || 'INCONNU',
                    service.utilisateur || 'N/A'
                ]);
            });
            
            const wsServices = XLSX.utils.aoa_to_sheet(donneesServices);
            XLSX.utils.book_append_sheet(wb, wsServices, "🔧 Services détaillés");
        }

        // === GÉNÉRER LE FICHIER ===
        const dateExport = new Date().toISOString().split('T')[0];
        const nomFichier = `recap_detaille_${periode}_${dateExport}.xlsx`;

        XLSX.writeFile(wb, nomFichier);
        
        console.log('✅ Export détaillé réussi');
        
        const onglets = [
            "📊 Synthèse",
            ...(ventesFiltrees.length > 0 ? ["🛒 Ventes détaillées"] : []),
            ...(servicesFiltrees.length > 0 ? ["🔧 Services détaillés"] : [])
        ];
        
        alert(`✅ Export détaillé généré !\n\n📁 Fichier: ${nomFichier}\n\n📋 Onglets inclus:\n${onglets.map(onglet => `• ${onglet}`).join('\n')}\n\n📊 Données: ${ventesFiltrees.length} ventes, ${servicesFiltrees.length} services`);

    } catch (error) {
        console.error('❌ Erreur export détaillé:', error);
        throw new Error('Export détaillé: ' + error.message);
    }
}

function lancerExportRecapitulatif() {
    if (!typeExportChoisi) {
        console.error('❌ Aucun type d\'export sélectionné');
        alert('❌ Veuillez sélectionner un type d\'export');
        return;
    }

    try {
        console.log(`🚀 Lancement export ${typeExportChoisi}...`);
        
        // Vérifier que XLSX est disponible
        if (typeof XLSX === 'undefined') {
            throw new Error('La bibliothèque Excel (XLSX) n\'est pas chargée. Vérifiez votre connexion internet.');
        }

        const periode = document.getElementById('recap-periode')?.value || 'aujourdhui';
        let dateDebut, dateFin;
        
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        
        // Calcul de période (commun aux deux exports)
        switch(periode) {
            case 'aujourdhui':
                dateDebut = new Date(aujourdhui);
                dateFin = new Date(aujourdhui);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'hier':
                dateDebut = new Date(aujourdhui);
                dateDebut.setDate(aujourdhui.getDate() - 1);
                dateFin = new Date(dateDebut);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'semaine':
                dateDebut = new Date(aujourdhui);
                dateDebut.setDate(aujourdhui.getDate() - aujourdhui.getDay());
                dateFin = new Date(aujourdhui);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'mois':
                dateDebut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
                dateFin = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0);
                dateFin.setHours(23, 59, 59, 999);
                break;
            case 'personnalise':
                const debutInput = document.getElementById('recap-date-debut')?.value;
                const finInput = document.getElementById('recap-date-fin')?.value;
                if (!debutInput || !finInput) {
                    alert('❌ Veuillez sélectionner les dates de début et de fin pour la période personnalisée');
                    return;
                }
                dateDebut = new Date(debutInput);
                dateFin = new Date(finInput);
                dateFin.setHours(23, 59, 59, 999);
                break;
            default:
                dateDebut = new Date(aujourdhui);
                dateFin = new Date(aujourdhui);
                dateFin.setHours(23, 59, 59, 999);
        }

        console.log('📅 Période export:', periode, 'Du:', dateDebut, 'Au:', dateFin);

        // Filtrer les données (commun aux deux exports)
        const ventesFiltrees = historiqueVentes.filter(vente => {
            if (!vente || vente.annule) return false;
            try {
                const dateVente = new Date(vente.date);
                return dateVente >= dateDebut && dateVente <= dateFin;
            } catch (error) {
                console.error('Erreur date vente:', error);
                return false;
            }
        });

        const servicesFiltrees = historiqueServices.filter(service => {
            if (!service) return false;
            try {
                const dateService = new Date(service.dateFinalisation || service.date);
                return dateService >= dateDebut && dateService <= dateFin;
            } catch (error) {
                console.error('Erreur date service:', error);
                return false;
            }
        });

        console.log('📊 Données filtrées:', {
            ventes: ventesFiltrees.length,
            services: servicesFiltrees.length
        });

        if (ventesFiltrees.length === 0 && servicesFiltrees.length === 0) {
            alert('❌ Aucune donnée à exporter pour la période sélectionnée');
            return;
        }

        // Calcul des totaux (commun aux deux exports)
        let ventesPayees = 0, ventesInstance = 0, ventesCredit = 0, totalGeneral = 0;
        
        ventesFiltrees.forEach(vente => {
            const montant = vente.total || 0;
            const statut = vente.statutPaiement;
            
            if (statut === 'paye') ventesPayees += montant;
            else if (statut === 'instance') ventesInstance += montant;
            else if (statut === 'credit') ventesCredit += montant;
            
            totalGeneral += montant;
        });

        servicesFiltrees.forEach(service => {
            const montant = service.montant || service.montantFinal || 0;
            const statut = service.statutPaiement;
            
            if (statut === 'paye') ventesPayees += montant;
            else if (statut === 'instance') ventesInstance += montant;
            else if (statut === 'credit') ventesCredit += montant;
            
            totalGeneral += montant;
        });

        console.log('💰 Totaux calculés:', {
            payees: ventesPayees,
            instance: ventesInstance,
            credit: ventesCredit,
            total: totalGeneral
        });

        // GÉNÉRATION SELON LE CHOIX
        if (typeExportChoisi === 'informatif') {
            exporterInformatif(ventesFiltrees, servicesFiltrees, periode, dateDebut, dateFin, totalGeneral, ventesPayees, ventesInstance, ventesCredit);
        } else if (typeExportChoisi === 'detaillé') {
            exporterDetaille(ventesFiltrees, servicesFiltrees, periode, dateDebut, dateFin, totalGeneral, ventesPayees, ventesInstance, ventesCredit);
        } else {
            throw new Error('Type d\'export non reconnu: ' + typeExportChoisi);
        }

    } catch (error) {
        console.error('❌ Erreur export récapitulatif:', error);
        alert('❌ Erreur lors de l\'export du récapitulatif\n\nDétails: ' + error.message);
        
        // Réessayer avec une méthode alternative si XLSX échoue
        if (error.message.includes('XLSX')) {
            alert('💡 Astuce: Vérifiez que vous avez une connexion internet stable pour charger la bibliothèque Excel.');
        }
    } finally {
        typeExportChoisi = null;
    }
}

// ==============================================
// FONCTIONS D'INTERFACE UTILISATEUR
// ==============================================

function changerOnglet(tabId) {
    console.log('🔀 Changement onglet:', tabId);
    
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
    const tabContent = document.getElementById(tabId);
    
    if (tabButton) tabButton.classList.add('active');
    if (tabContent) tabContent.classList.add('active');

    switch(tabId) {
        case 'stock':
            afficherStock();
            break;
        case 'historique':
            afficherHistorique();
            break;
        case 'services':
            mettreAJourPanierServices();
            break;
        case 'recapitulatif':
            genererRecapitulatif();
            break;
        case 'ventes':
            setTimeout(() => {
                const searchInput = document.getElementById('search-product');
                if (searchInput) searchInput.focus();
            }, 100);
            break;
    }
}

function changerSousOnglet(subtabId) {
    document.querySelectorAll('.subtab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.subtab-content').forEach(content => content.classList.remove('active'));
    
    const subtabButton = document.querySelector(`[data-subtab="${subtabId}"]`);
    const subtabContent = document.getElementById(subtabId);
    
    if (subtabButton) subtabButton.classList.add('active');
    if (subtabContent) subtabContent.classList.add('active');
}

function actualiserDateHeure() {
    const maintenant = new Date();
    const dateTimeElement = document.getElementById('date-time');
    if (dateTimeElement) {
        dateTimeElement.textContent = `📅 ${maintenant.toLocaleDateString('fr-FR')} - 🕒 ${maintenant.toLocaleTimeString('fr-FR')}`;
    }
}

function changerModePaiement() {
    const modePaiement = document.getElementById('payment-method')?.value;
    const sectionClient = document.getElementById('client-credit-section');
    
    if (sectionClient) {
        sectionClient.style.display = modePaiement === 'credit' ? 'block' : 'none';
    }
}

function changerModePaiementServices() {
    const modePaiement = document.getElementById('service-paiement')?.value;
    const sectionClient = document.getElementById('service-client-section');
    
    if (sectionClient) {
        sectionClient.style.display = modePaiement === 'credit' ? 'block' : 'none';
    }
}

function changerPeriodeRecap() {
    const periode = document.getElementById('recap-periode')?.value;
    const sectionDates = document.getElementById('recap-dates-personnalisees');
    
    if (sectionDates) {
        sectionDates.style.display = periode === 'personnalise' ? 'block' : 'none';
    }
}

// ==============================================
// GESTION DES PRODUITS ET RECHERCHE
// ==============================================

function executerRecherche(recherche, forceRecherche) {
    if (!recherche) {
        afficherProduits();
        return;
    }

    const produitsFiltres = stockData.filter(produit => {
        if (!produit || !produit.DESIGNATION || !produit['CODE-BR']) return false;
        
        const nomProduit = produit.DESIGNATION.toLowerCase();
        const codeProduit = produit['CODE-BR'].toString().toLowerCase();
        const quantite = parseInt(produit.QUANTITE) || 0;
        
        const nomMatch = nomProduit.includes(recherche.toLowerCase());
        const codeMatch = codeProduit.includes(recherche.toLowerCase());
        
        return (nomMatch || codeMatch) && quantite > 0;
    });
    
    afficherResultatsRecherche(produitsFiltres);
}

function executerRechercheCodeBarre(codeBarre) {
    if (!codeBarre || codeBarre.length < 3) return;
    
    const produit = stockData.find(p => 
        p['CODE-BR'] && p['CODE-BR'].toString().toLowerCase() === codeBarre.toLowerCase()
    );
    
    if (produit) {
        ajouterProduitAuPanier(produit['CODE-BR']);
        effacerChampRecherche();
    } else {
        console.log('❌ Code barre non trouvé:', codeBarre);
    }
}

function afficherResultatsRecherche(produitsFiltres) {
    const tbody = document.getElementById('products-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (produitsFiltres.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Aucun produit trouvé</td></tr>`;
        return;
    }
    
    produitsFiltres.forEach(produit => {
        const tr = document.createElement('tr');
        tr.className = 'produit-item';
        tr.innerHTML = `
            <td>${produit.DESIGNATION || 'N/A'}</td>
            <td>${produit['CODE-BR'] || 'N/A'}</td>
            <td>${produit['PRIX-U'] || 0} DA</td>
            <td>${produit.QUANTITE || 0}</td>
            <td>
                <button class="btn-ajouter" onclick="ajouterProduitAuPanier('${produit['CODE-BR']}')">
                    ➕
                </button>
            </td>
        `;
        
        tr.addEventListener('dblclick', () => {
            ajouterProduitAuPanier(produit['CODE-BR']);
        });
        
        tbody.appendChild(tr);
    });
}

function ajouterProduitAuPanier(codeBarre) {
    const produit = stockData.find(p => p['CODE-BR'] === codeBarre);
    if (!produit) return;

    const existingItem = panier.find(item => item.code === codeBarre);
    
    if (existingItem) {
        const stockDisponible = getStockDisponible(codeBarre);
        if (existingItem.quantite < stockDisponible) {
            existingItem.quantite += 1;
            existingItem.total = existingItem.quantite * existingItem.prix;
        } else {
            alert(`❌ Stock insuffisant! Stock disponible: ${stockDisponible}`);
        }
    } else {
        panier.push({
            designation: produit.DESIGNATION || 'Produit sans nom',
            code: produit['CODE-BR'],
            quantite: 1,
            prix: parseFloat(produit['PRIX-U']) || 0,
            total: parseFloat(produit['PRIX-U']) || 0,
            remise: 0,
            typeRemise: 'DA'
        });
    }
    
    mettreAJourPanier();
    effacerChampRecherche();
}

function effacerChampRecherche() {
    const searchInput = document.getElementById('search-product');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
}

function rechercherProduit() {
    const searchInput = document.getElementById('search-product');
    if (searchInput) {
        const recherche = searchInput.value.trim();
        if (recherche) {
            executerRecherche(recherche, true);
        }
    }
}

function effacerRecherche() {
    effacerChampRecherche();
    afficherProduits();
}

// ==============================================
// GESTION DU PANIER VENTE - AVEC REMISES
// ==============================================

function mettreAJourPanier() {
    const tbody = document.getElementById('cart-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (panier.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Panier vide</td></tr>`;
        recalculerTotaux();
        return;
    }
    
    panier.forEach((item, index) => {
        const tr = document.createElement('tr');
        const stockDisponible = getStockDisponible(item.code);
        const totalApresRemise = calculerTotalAvecRemise(item);
        const statutPaiement = document.getElementById('payment-method')?.value || 'paye';
        
        const disabledState = remiseGlobale.active ? 'disabled' : '';
        const disabledStyle = remiseGlobale.active ? 'style="background-color: var(--bg-primary); color: var(--text-secondary);"' : '';
        
        tr.innerHTML = `
            <td class="col-designation">${item.designation}</td>
            <td class="col-quantite">
                <input type="number" class="quantite-panier" value="${item.quantite}" 
                       min="1" max="${stockDisponible}" ${disabledState} ${disabledStyle}
                       onchange="modifierQuantite(${index}, this.value)">
            </td>
            <td class="col-prix">
                <input type="number" class="prix-panier" value="${item.prix}" 
                       min="0" step="1" ${disabledState} ${disabledStyle}
                       onchange="modifierPrixProduit(${index}, this.value)">
            </td>
            <td class="col-remise">
                <div class="remise-produit">
                    <select class="remise-type" onchange="changerTypeRemiseProduit(${index}, this.value)" ${disabledState} ${disabledStyle}>
                        <option value="DA" ${item.typeRemise === 'DA' ? 'selected' : ''}>DA</option>
                        <option value="%" ${item.typeRemise === '%' ? 'selected' : ''}>%</option>
                    </select>
                    <input type="number" class="remise-valeur" value="${item.remise || 0}" 
                           min="0" step="1" ${disabledState} ${disabledStyle}
                           onchange="appliquerRemiseProduit(${index}, this.value)">
                </div>
            </td>
            <td class="col-total">${totalApresRemise} DA</td>
            <td class="col-statut">${getBadgeStatutPaiement(statutPaiement)}</td>
            <td class="col-action">
                <button class="btn-supprimer" onclick="retirerDuPanier(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    recalculerTotaux();
}

function modifierQuantite(index, nouvelleQuantite) {
    const quantite = parseInt(nouvelleQuantite);
    if (isNaN(quantite)) return;
    
    const stockDisponible = getStockDisponible(panier[index].code);
    
    if (quantite > 0 && quantite <= stockDisponible) {
        panier[index].quantite = quantite;
        panier[index].total = quantite * panier[index].prix;
        mettreAJourPanier();
    } else {
        alert(`❌ Quantité invalide! Stock disponible: ${stockDisponible}`);
        mettreAJourPanier();
    }
}

function modifierPrixProduit(index, nouveauPrix) {
    const prix = parseFloat(nouveauPrix);
    if (!isNaN(prix) && prix >= 0) {
        panier[index].prix = prix;
        panier[index].total = panier[index].quantite * prix;
        mettreAJourPanier();
    }
}

function changerTypeRemiseProduit(index, type) {
    panier[index].typeRemise = type;
    mettreAJourPanier();
}

function appliquerRemiseProduit(index, valeurRemise) {
    const remise = parseFloat(valeurRemise);
    if (!isNaN(remise) && remise >= 0) {
        panier[index].remise = remise;
        mettreAJourPanier();
    }
}

function calculerTotalAvecRemise(item) {
    if (!item.remise || item.remise === 0) return item.total;
    
    if (item.typeRemise === '%') {
        const remiseMontant = item.total * (item.remise / 100);
        return item.total - remiseMontant;
    } else {
        return Math.max(0, item.total - item.remise);
    }
}

function retirerDuPanier(index) {
    if (index >= 0 && index < panier.length) {
        panier.splice(index, 1);
        mettreAJourPanier();
    }
}

function viderPanier() {
    if (panier.length === 0) return;
    
    if (confirm('🗑️ Voulez-vous vraiment vider le panier?')) {
        panier = [];
        remiseGlobale = { active: false, type: 'DA', valeur: 0 };
        mettreAJourPanier();
    }
}

function recalculerTotaux() {
    const sousTotal = panier.reduce((sum, item) => sum + (item.total || 0), 0);
    
    let totalRemises = 0;
    let totalGeneral = sousTotal;
    
    if (remiseGlobale.active) {
        // REMISE GLOBALE AVEC CHOIX DA ou %
        if (remiseGlobale.type === '%') {
            totalRemises = sousTotal * (remiseGlobale.valeur / 100);
        } else {
            totalRemises = remiseGlobale.valeur;
        }
        totalGeneral = Math.max(0, sousTotal - totalRemises);
        
        // Afficher le bouton d'annulation
        const btnAnnuler = document.getElementById('btn-annuler-remise-vente');
        if (btnAnnuler) btnAnnuler.style.display = 'block';
    } else {
        totalRemises = panier.reduce((sum, item) => {
            if (item.remise && item.remise > 0) {
                if (item.typeRemise === '%') {
                    return sum + (item.total * item.remise / 100);
                } else {
                    return sum + item.remise;
                }
            }
            return sum;
        }, 0);
        totalGeneral = sousTotal - totalRemises;
    }
    
    const sousTotalElement = document.getElementById('sous-total');
    const remiseGlobaleElement = document.getElementById('montant-remise-globale');
    const totalGeneralElement = document.getElementById('total-general');
    
    if (sousTotalElement) sousTotalElement.textContent = `${sousTotal} DA`;
    if (remiseGlobaleElement) remiseGlobaleElement.textContent = `-${totalRemises} DA`;
    if (totalGeneralElement) totalGeneralElement.textContent = `${totalGeneral} DA`;
}

function getStockDisponible(codeProduit) {
    const produit = stockData.find(p => p['CODE-BR'] === codeProduit);
    return produit ? parseInt(produit.QUANTITE) || 0 : 0;
}

// ==============================================
// REMISE GLOBALE AVANCÉE - AVEC % ET ANNULATION
// ==============================================

function ouvrirModalRemiseGlobale(type = 'vente') {
    const modal = document.getElementById('modal-remise-globale');
    const title = document.getElementById('modal-remise-title');
    
    if (modal && title) {
        // Configurer le titre selon le type
        title.textContent = type === 'vente' 
            ? '🎯 Remise Globale - Ventes' 
            : '🎯 Remise Globale - Services';
        
        // Stocker le type pour la confirmation
        modal.dataset.type = type;
        
        // Réinitialiser les valeurs
        document.getElementById('remise-montant').value = '';
        document.getElementById('remise-type').value = 'DA';
        document.getElementById('remise-existe').checked = false;
        
        modal.style.display = 'flex';
    }
}

function appliquerRemiseGlobaleAmelioree() {
    const modal = document.getElementById('modal-remise-globale');
    const type = modal.dataset.type;
    
    const montantInput = document.getElementById('remise-montant').value;
    const typeRemise = document.getElementById('remise-type').value;
    const remplacerExistantes = document.getElementById('remise-existe').checked;
    
    const montant = parseFloat(montantInput);
    
    if (!isNaN(montant) && montant >= 0) {
        if (type === 'vente') {
            // Appliquer à la vente
            if (remplacerExistantes) {
                panier.forEach(produit => {
                    produit.remise = 0;
                });
            }
            
            remiseGlobale = { 
                active: true, 
                type: typeRemise, 
                valeur: montant 
            };
            
            mettreAJourPanier();
            alert(`✅ Remise globale de ${montant} ${typeRemise} appliquée!`);
            
        } else {
            // Appliquer aux services
            if (remplacerExistantes) {
                panierServices.forEach(service => {
                    service.remise = 0;
                });
            }
            
            remiseGlobaleServices = { 
                active: true, 
                type: typeRemise, 
                valeur: montant 
            };
            
            mettreAJourPanierServices();
            alert(`✅ Remise globale de ${montant} ${typeRemise} appliquée aux services!`);
        }
        
        fermerModalRemiseGlobale();
    } else {
        alert('❌ Montant de remise invalide');
    }
}

function annulerRemiseGlobale(type = 'vente') {
    if (confirm('❌ Annuler la remise globale ?\nLes remises individuelles seront réactivées.')) {
        if (type === 'vente') {
            remiseGlobale = { active: false, type: 'DA', valeur: 0 };
            mettreAJourPanier();
        } else {
            remiseGlobaleServices = { active: false, type: 'DA', valeur: 0 };
            mettreAJourPanierServices();
        }
        alert('🔄 Remise globale annulée');
    }
}

function fermerModalRemiseGlobale() {
    const modal = document.getElementById('modal-remise-globale');
    if (modal) modal.style.display = 'none';
}

// Gestion dynamique de l'aide selon le type de remise
function configurerAideRemiseGlobale() {
    const typeRemise = document.getElementById('remise-type');
    const helpDA = document.getElementById('help-da');
    const helpPourcent = document.getElementById('help-pourcent');
    
    if (typeRemise && helpDA && helpPourcent) {
        typeRemise.addEventListener('change', function() {
            if (this.value === '%') {
                helpDA.style.display = 'none';
                helpPourcent.style.display = 'block';
            } else {
                helpDA.style.display = 'block';
                helpPourcent.style.display = 'none';
            }
        });
    }
}

// ==============================================
// FONCTIONS DE VENTE AVEC RÉINITIALISATION REMISE
// ==============================================

function finaliserVente() {
    if (panier.length === 0) {
        alert('❌ Panier vide - Aucune vente à finaliser');
        return;
    }
    
    const modePaiement = document.getElementById('payment-method')?.value;
    const client = document.getElementById('client-credit')?.value || '';
    const total = recalculerTotalGeneral();
    
    if (modePaiement === 'credit' && !client) {
        alert('❌ Veuillez saisir le nom du client pour un paiement à crédit');
        return;
    }
    
    if (confirm(`✅ Finaliser la vente de ${panier.length} produit(s) pour ${total} DA ?\nMode de paiement: ${modePaiement.toUpperCase()}`)) {
        panier.forEach(item => {
            const produit = stockData.find(p => p['CODE-BR'] === item.code);
            if (produit) {
                produit.QUANTITE = Math.max(0, produit.QUANTITE - item.quantite);
            }
        });
        
        const vente = {
            id: Date.now(),
            date: new Date().toISOString(),
            produits: [...panier],
            total: total,
            statutPaiement: modePaiement,
            client: client,
            utilisateur: SessionManager.currentUser,
            annule: false
        };
        
        historiqueVentes.push(vente);
        
        remiseGlobale = { active: false, type: 'DA', valeur: 0 };
        
        SauvegardeManager.sauvegarderDonnees();
        panier = [];
        mettreAJourPanier();
        afficherProduits();
        afficherStock();
        
        alert('✅ Vente finalisée avec succès!');
    }
}

function recalculerTotalGeneral() {
    const sousTotal = panier.reduce((sum, item) => sum + (item.total || 0), 0);
    
    if (remiseGlobale.active) {
        return Math.max(0, sousTotal - remiseGlobale.valeur);
    } else {
        const totalRemises = panier.reduce((sum, item) => {
            if (item.remise && item.remise > 0) {
                if (item.typeRemise === '%') {
                    return sum + (item.total * item.remise / 100);
                } else {
                    return sum + item.remise;
                }
            }
            return sum;
        }, 0);
        return sousTotal - totalRemises;
    }
}

// ==============================================
// GESTION DU STOCK
// ==============================================

function afficherProduits() {
    const tbody = document.getElementById('products-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!stockData || stockData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Aucun produit en stock</td></tr>`;
        return;
    }
    
    stockData.forEach(produit => {
        const tr = document.createElement('tr');
        tr.className = 'produit-item';
        tr.innerHTML = `
            <td>${produit.DESIGNATION || 'N/A'}</td>
            <td>${produit['CODE-BR'] || 'N/A'}</td>
            <td>${produit['PRIX-U'] || 0} DA</td>
            <td>${produit.QUANTITE || 0}</td>
            <td>
                <button class="btn-ajouter" onclick="ajouterProduitAuPanier('${produit['CODE-BR']}')">
                    ➕
                </button>
            </td>
        `;
        
        tr.addEventListener('dblclick', () => {
            ajouterProduitAuPanier(produit['CODE-BR']);
        });
        
        tbody.appendChild(tr);
    });
}

function afficherStock() {
    const tbody = document.getElementById('stock-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!stockData || stockData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Stock vide</td></tr>`;
        return;
    }
    
    stockData.forEach(produit => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${produit.DESIGNATION || 'N/A'}</td>
            <td>${produit['CODE-BR'] || 'N/A'}</td>
            <td>${produit.CATEGORIE || ''}</td>
            <td>${produit.QUANTITE || 0}</td>
            <td>${produit['PRIX-U'] || 0} DA</td>
            <td>${(produit.QUANTITE || 0) * (produit['PRIX-U'] || 0)} DA</td>
        `;
        tbody.appendChild(tr);
    });
}

function chargerStock() {
    SauvegardeManager.chargerStockXLSInitial();
}

function exporterStock() {
    try {
        if (!stockData || stockData.length === 0) {
            alert('❌ Aucune donnée à exporter');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(stockData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock");
        XLSX.writeFile(wb, "stock_export.xlsx");
        alert('✅ Stock exporté avec succès!');
    } catch (error) {
        console.error('❌ Erreur export:', error);
        alert('❌ Erreur lors de l\'export');
    }
}

function importerFichierStock(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const importedData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (importedData && importedData.length > 0) {
                stockData = importedData;
                SauvegardeManager.sauvegarderDonnees();
                afficherProduits();
                afficherStock();
                alert('✅ Stock importé avec succès!');
            } else {
                alert('❌ Le fichier est vide ou invalide');
            }
        } catch (error) {
            console.error('❌ Erreur import:', error);
            alert('❌ Erreur lors de l\'import');
        }
    };
    reader.readAsArrayBuffer(file);
    
    event.target.value = '';
}

function reinitialiserStock() {
    if (confirm('🔄 Réinitialiser le stock ?')) {
        stockData = [];
        SauvegardeManager.sauvegarderDonnees();
        afficherProduits();
        afficherStock();
        alert('✅ Stock réinitialisé!');
    }
}

// ==============================================
// GESTION DES SERVICES
// ==============================================

function activerServicePourAjustement(typeService) {
    const service = servicesConfig[typeService]?.[0];
    if (!service) return;

    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-type="${typeService}"]`).classList.add('active');

    document.getElementById('service-description').value = service.nom;
    document.getElementById('service-amount').value = service.prix;
    document.getElementById('service-amount').focus();
    
    console.log('🔧 Service activé pour ajustement:', service.nom);
}

function ajouterServiceDirectAuPanier(typeService) {
    const service = servicesConfig[typeService]?.[0];
    if (!service) return;

    const description = document.getElementById('service-description')?.value || service.nom;
    const montant = parseFloat(document.getElementById('service-amount')?.value) || service.prix;
    const client = document.getElementById('service-client')?.value || '';

    if (montant <= 0) {
        alert('❌ Le montant doit être supérieur à 0');
        return;
    }

    panierServices.push({
        type: typeService,
        nom: service.nom,
        description: description !== service.nom ? description : '',
        montant: montant,
        montantFinal: montant,
        quantite: 1,
        client: client,
        statutPaiement: 'paye',
        date: new Date().toISOString(),
        remise: 0,
        typeRemise: 'DA'
    });

    mettreAJourPanierServices();
    
    const carte = document.querySelector(`[data-type="${typeService}"]`);
    carte.style.background = 'var(--success-color)';
    carte.style.color = 'white';
    setTimeout(() => {
        carte.style.background = '';
        carte.style.color = '';
    }, 500);
    
    alert(`✅ Service "${service.nom}" ajouté directement au panier!`);
}

function ajouterServiceAuPanier() {
    const typeService = document.querySelector('.service-card.active')?.dataset.type;
    const description = document.getElementById('service-description')?.value;
    const montant = parseFloat(document.getElementById('service-amount')?.value) || 0;
    const client = document.getElementById('service-client')?.value;
    
    if (!description || description.trim() === '') {
        alert('❌ Veuillez saisir une description pour le service');
        return;
    }
    
    if (montant <= 0) {
        alert('❌ Le montant doit être supérieur à 0');
        return;
    }
    
    const typeFinal = typeService || 'autre';
    const serviceType = servicesConfig[typeFinal]?.[0];
    
    const nomService = typeService ? (serviceType?.nom || `Service ${typeFinal}`) : description;
    const descriptionFinale = description && description !== nomService ? description : '';
    
    panierServices.push({
        type: typeFinal,
        nom: nomService,
        description: descriptionFinale,
        montant: montant,
        montantFinal: montant,
        quantite: 1,
        client: client,
        statutPaiement: 'paye',
        date: new Date().toISOString(),
        remise: 0,
        typeRemise: 'DA'
    });
    
    mettreAJourPanierServices();
    
    document.getElementById('service-description').value = '';
    document.getElementById('service-amount').value = '0';
    document.getElementById('service-client').value = '';
    document.querySelectorAll('.service-card').forEach(card => card.classList.remove('active'));
    
    setTimeout(() => {
        document.getElementById('service-description').focus();
    }, 100);
    
    alert('✅ Service ajouté au panier!');
}

function mettreAJourPanierServices() {
    const tbody = document.getElementById('services-panier-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (panierServices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Aucun service dans le panier</td></tr>`;
        recalculerTotalServices();
        return;
    }
    
    panierServices.forEach((service, index) => {
        const tr = document.createElement('tr');
        const totalApres = calculerMontantServiceAvecRemise(service);
        const statutPaiement = document.getElementById('service-paiement')?.value || 'paye';
        
        const disabledState = remiseGlobaleServices.active ? 'disabled' : '';
        const disabledStyle = remiseGlobaleServices.active ? 'style="background-color: var(--bg-primary); color: var(--text-secondary);"' : '';
        
        const affichageDesignation = service.description && service.description !== service.nom 
            ? `${service.nom}<br><small>${service.description}</small>`
            : service.nom;
        
        tr.innerHTML = `
            <td class="col-service">${affichageDesignation}</td>
            <td class="col-quantite-service">
                <input type="number" class="quantite-panier" value="${service.quantite || 1}" 
                       min="1" max="999" ${disabledState} ${disabledStyle}
                       onchange="modifierQuantiteService(${index}, this.value)">
            </td>
            <td class="col-prix-service">
                <input type="number" class="prix-service-panier" value="${service.montant}" 
                       min="0" step="1" ${disabledState} ${disabledStyle}
                       onchange="modifierPrixServicePanier(${index}, this.value)">
            </td>
            <td class="col-remise-service">
                <div class="remise-service">
                    <select class="remise-type" onchange="changerTypeRemiseService(${index}, this.value)" ${disabledState} ${disabledStyle}>
                        <option value="DA" ${service.typeRemise === 'DA' ? 'selected' : ''}>DA</option>
                        <option value="%" ${service.typeRemise === '%' ? 'selected' : ''}>%</option>
                    </select>
                    <input type="number" class="remise-service-valeur" value="${service.remise || 0}" 
                           min="0" step="1" placeholder="0" ${disabledState} ${disabledStyle}
                           onchange="appliquerRemiseService(${index}, this.value)">
                </div>
            </td>
            <td class="col-total-service">${totalApres} DA</td>
            <td class="col-statut-service">${getBadgeStatutPaiement(statutPaiement)}</td>
            <td class="col-action-service">
                <button class="btn-supprimer" onclick="retirerServiceDuPanier(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    recalculerTotalServices();
}

function modifierQuantiteService(index, nouvelleQuantite) {
    const quantite = parseInt(nouvelleQuantite);
    if (!isNaN(quantite) && quantite > 0) {
        panierServices[index].quantite = quantite;
        panierServices[index].montantFinal = calculerMontantServiceAvecRemise(panierServices[index]);
        mettreAJourPanierServices();
    }
}

function modifierPrixServicePanier(index, nouveauPrix) {
    const prix = parseFloat(nouveauPrix);
    if (!isNaN(prix) && prix >= 0) {
        panierServices[index].montant = prix;
        panierServices[index].montantFinal = calculerMontantServiceAvecRemise(panierServices[index]);
        mettreAJourPanierServices();
    }
}

function changerTypeRemiseService(index, type) {
    panierServices[index].typeRemise = type;
    mettreAJourPanierServices();
}

function appliquerRemiseService(index, valeurRemise) {
    const remise = parseFloat(valeurRemise);
    if (!isNaN(remise) && remise >= 0) {
        panierServices[index].remise = remise;
        panierServices[index].montantFinal = calculerMontantServiceAvecRemise(panierServices[index]);
        mettreAJourPanierServices();
    }
}

function calculerMontantServiceAvecRemise(service) {
    if (!service.remise || service.remise === 0) return service.montant * (service.quantite || 1);
    
    const totalAvantRemise = service.montant * (service.quantite || 1);
    
    if (service.typeRemise === '%') {
        const remiseMontant = totalAvantRemise * (service.remise / 100);
        return totalAvantRemise - remiseMontant;
    } else {
        return Math.max(0, totalAvantRemise - service.remise);
    }
}

function appliquerRemiseGlobaleServices() {
    const remiseInput = prompt('Montant de la remise globale à appliquer au TOTAL services (DA):');
    const remise = parseFloat(remiseInput);
    
    if (!isNaN(remise) && remise >= 0) {
        panierServices.forEach(service => {
            service.remise = 0;
        });
        
        remiseGlobaleServices = { 
            active: true, 
            type: 'DA', 
            valeur: remise 
        };
        
        mettreAJourPanierServices();
        alert(`✅ Remise globale de ${remise} DA appliquée au total services!`);
    } else if (remiseInput !== null) {
        alert('❌ Montant de remise invalide');
    }
}

function getBadgeStatutPaiement(statut) {
    const badges = {
        'paye': '<span class="badge badge-paye">PAYÉ</span>',
        'instance': '<span class="badge badge-instance">INSTANCE</span>',
        'credit': '<span class="badge badge-credit">CRÉDIT</span>'
    };
    return badges[statut] || '<span class="badge">INCONNU</span>';
}

function retirerServiceDuPanier(index) {
    if (index >= 0 && index < panierServices.length) {
        panierServices.splice(index, 1);
        mettreAJourPanierServices();
    }
}

function recalculerTotalServices() {
    let sousTotal = panierServices.reduce((sum, service) => {
        return sum + (service.montant * (service.quantite || 1));
    }, 0);

    let remiseGlobale = 0;
    let totalGeneral = sousTotal;

    if (remiseGlobaleServices.active) {
        // REMISE GLOBALE AVEC CHOIX DA ou %
        if (remiseGlobaleServices.type === '%') {
            remiseGlobale = sousTotal * (remiseGlobaleServices.valeur / 100);
        } else {
            remiseGlobale = remiseGlobaleServices.valeur;
        }
        totalGeneral = Math.max(0, sousTotal - remiseGlobale);
        
        // Afficher le bouton d'annulation
        const btnAnnuler = document.getElementById('btn-annuler-remise-service');
        if (btnAnnuler) btnAnnuler.style.display = 'block';
    } else {
        totalGeneral = panierServices.reduce((sum, service) => {
            return sum + (service.montantFinal || service.montant || 0);
        }, 0);
        remiseGlobale = sousTotal - totalGeneral;
    }

    const sousTotalElement = document.getElementById('sous-total-services');
    const remiseGlobaleElement = document.getElementById('remise-globale-services');
    const totalElement = document.getElementById('total-services');

    if (sousTotalElement) sousTotalElement.textContent = `${sousTotal} DA`;
    if (remiseGlobaleElement) remiseGlobaleElement.textContent = `-${remiseGlobale} DA`;
    if (totalElement) totalElement.textContent = `${totalGeneral} DA`;
}

function finaliserServicesPanier() {
    if (panierServices.length === 0) {
        alert('❌ Aucun service à finaliser');
        return;
    }

    const modePaiement = document.getElementById('service-paiement')?.value;
    let total = panierServices.reduce((sum, service) => {
        if (remiseGlobaleServices.active) {
            return sum + (service.montant * (service.quantite || 1));
        } else {
            return sum + (service.montantFinal || service.montant || 0);
        }
    }, 0);
    
    if (remiseGlobaleServices.active) {
        total = Math.max(0, total - remiseGlobaleServices.valeur);
    }
    
    if (confirm(`✅ Finaliser ${panierServices.length} service(s) pour un total de ${total} DA ?\nMode de paiement: ${modePaiement.toUpperCase()}`)) {
        panierServices.forEach(service => {
            historiqueServices.push({
                ...service,
                statutPaiement: modePaiement,
                client: service.client || '',
                dateFinalisation: new Date().toISOString(),
                utilisateur: SessionManager.currentUser
            });
        });
        
        SauvegardeManager.sauvegarderDonnees();
        
        panierServices = [];
        remiseGlobaleServices = { active: false, type: 'DA', valeur: 0 };
        mettreAJourPanierServices();
        
        alert('✅ Services finalisés avec succès!');
    }
}

function viderPanierServices() {
    if (panierServices.length === 0) return;
    
    if (confirm('🗑️ Voulez-vous vraiment vider le panier de services?')) {
        panierServices = [];
        remiseGlobaleServices = { active: false, type: 'DA', valeur: 0 };
        mettreAJourPanierServices();
    }
}

function previsualiserTicketServicesPanier() {
    if (panierServices.length === 0) {
        alert('❌ Aucun service à visualiser');
        return;
    }
    
    const total = panierServices.reduce((sum, service) => sum + (service.montantFinal || service.montant || 0), 0);
    let ticketContent = `🎫 TICKET SERVICES - ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    
    panierServices.forEach(service => {
        ticketContent += `• ${service.nom}: ${service.montantFinal || service.montant} DA\n`;
        if (service.description) {
            ticketContent += `  ${service.description}\n`;
        }
    });
    
    ticketContent += `\n💰 TOTAL: ${total} DA`;
    
    alert(ticketContent);
}

// ==============================================
// GESTION HISTORIQUE
// ==============================================

function afficherHistorique() {
    afficherHistoriqueVentes();
    afficherHistoriqueServices();
}

function afficherHistoriqueVentes() {
    const tbody = document.getElementById('sales-history-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (historiqueVentes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Aucune vente enregistrée</td></tr>`;
        return;
    }
    
    historiqueVentes.slice().reverse().forEach((v, idxGlobal) => {
        const idxReel = historiqueVentes.length - 1 - idxGlobal;
        const id = `v-${v.id}`;
        
       // HTML pour les produits avec boutons Retour/Échange - VERSION FORCÉE
// HTML pour les produits - VERSION TABLE SIMPLE
const htmlProduits = (v.produits || []).map((p, pIndex) => {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:1px 0;margin:0;">
<div><strong>${p.quantite} × ${p.designation}</strong><br><small style="color:var(--text-secondary);font-size:0.8em;">${p.prix} DA × ${p.quantite} = ${(p.quantite * p.prix).toFixed(0)} DA</small></div>
<div><button onclick="ouvrirModalRetourProduit(${idxReel},${pIndex})" style="padding:2px 6px;background:var(--warning-color);color:white;border:none;border-radius:2px;cursor:pointer;font-size:0.6rem;margin-left:3px;">↩️ Retour</button><button onclick="ouvrirModalEchangeProduit(${idxReel},${pIndex})" style="padding:2px 6px;background:var(--info-color);color:white;border:none;border-radius:2px;cursor:pointer;font-size:0.6rem;margin-left:3px;">🔄 Échange</button></div>
</div>`;
}).join('');
        
        tbody.insertAdjacentHTML('beforeend', `<tr class="h-row" data-id="${id}">
<td>${new Date(v.date).toLocaleString('fr-FR')}</td>
<td>${v.produits?.length || 0} produit(s)</td>
<td>${v.total} DA</td>
<td>${getBadgeStatutPaiement(v.statutPaiement)}</td>
<td>
<button class="btn-view" onclick="toggleDetail('${id}')" title="Voir">👁️</button>
${!v.annule ? `<button class="btn-annuler" onclick="annulerVente(${idxReel})" title="Annuler">❌</button>` : `<button class="btn-restaurer" onclick="restaurerVente(${idxReel})" title="Restaurer">↩️</button>`}
</td>
</tr>
<tr class="h-detail" id="detail-${id}" style="display:none">
<td colspan="6">
<div class="detail-box">
<div style="margin-bottom: 2px;"><strong>Détail vente n°${v.id}</strong></div>
<div style="margin-bottom: 2px;">${htmlProduits}</div>
<div style="border-top: 1px solid var(--border-color); padding-top: 3px;">
<strong>Total : ${v.total} DA</strong><br>
<strong>Client :</strong> ${v.client || '—'}<br>
<strong>Vendeur :</strong> ${v.utilisateur || '—'}<br>
<strong>Statut :</strong> ${v.statutPaiement?.toUpperCase() || 'INCONNU'}
</div>
</div>
</td>
</tr>`);
    });
}

function afficherHistoriqueServices() {
    const tbody = document.getElementById('services-history-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (historiqueServices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Aucun service enregistré</td></tr>`;
        return;
    }
    
    historiqueServices.slice().reverse().forEach((s, idxGlobal) => {
  const id = `s-${Date.parse(s.dateFinalisation || s.date)}-${idxGlobal}`;

  tbody.insertAdjacentHTML('beforeend', `
    <tr class="h-row" data-id="${id}">
      <td>${new Date(s.dateFinalisation || s.date).toLocaleString('fr-FR')}</td>
      <td>${s.type}</td>
      <td>${s.nom}</td>
      <td>${s.description || '—'}</td>
      <td>${s.montant} DA</td>
      <td>${s.client || '—'}</td>
      <td>${getBadgeStatutPaiement(s.statutPaiement)}</td>
      <td>
        <button class="btn-view" onclick="toggleDetail('${id}')" title="Voir">👁️</button>
        <button class="btn-annuler" onclick="annulerService(${historiqueServices.length - 1 - idxGlobal})" title="Annuler">❌</button>
      </td>
    </tr>
    <tr class="h-detail" id="detail-${id}" style="display:none">
      <td colspan="8">
        <div class="detail-box"><strong>Détail service</strong>
Type : ${s.type}
Nom : ${s.nom}
Description : ${s.description || '—'}
Montant : ${s.montant} DA
Client : ${s.client || '—'}
Vendeur : ${s.utilisateur || '—'}
        </div>
      </td>
    </tr>
  `);
});
}

function annulerVente(index) {
    if (!SessionManager.aDroit('annuler_vente')) {
        alert('❌ Droits administrateur requis');
        return;
    }
    
    const vente = historiqueVentes[index];
    if (!vente) return;
    
    if (confirm(`❌ Annuler la vente du ${new Date(vente.date).toLocaleString('fr-FR')} ?\nTotal: ${vente.total} DA`)) {
        vente.annule = true;
        
        vente.produits?.forEach(produitVendu => {
            const produitStock = stockData.find(p => p['CODE-BR'] === produitVendu.code);
            if (produitStock) {
                produitStock.QUANTITE = (parseInt(produitStock.QUANTITE) || 0) + (produitVendu.quantite || 0);
            }
        });
        
        SauvegardeManager.sauvegarderDonnees();
        afficherHistoriqueVentes();
        afficherStock();
        
        alert('✅ Vente annulée - Stock restauré');
    }
}

function restaurerVente(index) {
    if (!SessionManager.aDroit('restaurer_vente')) {
        alert('❌ Droits administrateur requis');
        return;
    }
    
    const vente = historiqueVentes[index];
    if (!vente) return;
    
    if (confirm(`↩️ Restaurer la vente du ${new Date(vente.date).toLocaleString('fr-FR')} ?\nTotal: ${vente.total} DA`)) {
        vente.annule = false;
        
        vente.produits?.forEach(produitVendu => {
            const produitStock = stockData.find(p => p['CODE-BR'] === produitVendu.code);
            if (produitStock) {
                produitStock.QUANTITE = Math.max(0, (parseInt(produitStock.QUANTITE) || 0) - (produitVendu.quantite || 0));
            }
        });
        
        SauvegardeManager.sauvegarderDonnees();
        afficherHistoriqueVentes();
        afficherStock();
        
        alert('✅ Vente restaurée');
    }
}

function annulerService(index) {
    if (!SessionManager.aDroit('annuler_vente')) {
        alert('❌ Droits administrateur requis');
        return;
    }
    
    const service = historiqueServices[index];
    if (!service) return;
    
    if (confirm(`❌ Annuler le service "${service.nom}" du ${new Date(service.dateFinalisation).toLocaleString('fr-FR')} ?\nMontant: ${service.montant} DA`)) {
        historiqueServices.splice(index, 1);
        SauvegardeManager.sauvegarderDonnees();
        afficherHistoriqueServices();
        alert('✅ Service annulé');
    }
}

function reinitialiserHistorique() {
    if (!SessionManager.aDroit('reinitialisation')) {
        alert('❌ Droits administrateur requis');
        return;
    }
    
    if (confirm('🗑️ Réinitialiser TOUT l\'historique ?\n\nCette action supprimera :\n• Toutes les ventes\n• Tous les services\n• Cette action est IRREVERSIBLE !')) {
        historiqueVentes = [];
        historiqueServices = [];
        SauvegardeManager.sauvegarderDonnees();
        afficherHistorique();
        alert('✅ Historique réinitialisé');
    }
}

// ==============================================
// RÉCAPITULATIF AVANCÉ - CORRIGÉ
// ==============================================

function initialiserDatesRecap() {
    const aujourdhui = new Date();
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    
    const debutInput = document.getElementById('recap-date-debut');
    const finInput = document.getElementById('recap-date-fin');
    
    if (debutInput) {
        debutInput.valueAsDate = debutMois;
    }
    if (finInput) {
        finInput.valueAsDate = aujourdhui;
    }
}

function genererRecapitulatif() {
    console.log('📊 Génération récapitulatif...');
    
    const periode = document.getElementById('recap-periode')?.value || 'aujourdhui';
    let dateDebut, dateFin;
    
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    switch(periode) {
        case 'aujourdhui':
            dateDebut = new Date(aujourdhui);
            dateFin = new Date(aujourdhui);
            dateFin.setHours(23, 59, 59, 999);
            break;
        case 'hier':
            dateDebut = new Date(aujourdhui);
            dateDebut.setDate(aujourdhui.getDate() - 1);
            dateFin = new Date(dateDebut);
            dateFin.setHours(23, 59, 59, 999);
            break;
        case 'semaine':
            dateDebut = new Date(aujourdhui);
            dateDebut.setDate(aujourdhui.getDate() - aujourdhui.getDay());
            dateFin = new Date(aujourdhui);
            dateFin.setHours(23, 59, 59, 999);
            break;
        case 'mois':
            dateDebut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
            dateFin = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0);
            dateFin.setHours(23, 59, 59, 999);
            break;
        case 'personnalise':
            const debutInput = document.getElementById('recap-date-debut')?.value;
            const finInput = document.getElementById('recap-date-fin')?.value;
            dateDebut = debutInput ? new Date(debutInput) : new Date(aujourdhui);
            dateFin = finInput ? new Date(finInput) : new Date(aujourdhui);
            dateFin.setHours(23, 59, 59, 999);
            break;
        default:
            dateDebut = new Date(aujourdhui);
            dateFin = new Date(aujourdhui);
            dateFin.setHours(23, 59, 59, 999);
    }
    
    console.log('📅 Période:', periode, 'Du:', dateDebut, 'Au:', dateFin);
    
    // Filtrer les ventes
    const ventesFiltrees = historiqueVentes.filter(vente => {
        if (!vente || vente.annule) return false;
        try {
            const dateVente = new Date(vente.date);
            return dateVente >= dateDebut && dateVente <= dateFin;
        } catch (error) {
            console.error('Erreur date vente:', error);
            return false;
        }
    });
    
    // Filtrer les services
    const servicesFiltrees = historiqueServices.filter(service => {
        if (!service) return false;
        try {
            const dateService = new Date(service.dateFinalisation || service.date);
            return dateService >= dateDebut && dateService <= dateFin;
        } catch (error) {
            console.error('Erreur date service:', error);
            return false;
        }
    });
    
    console.log('📊 Ventes filtrées:', ventesFiltrees.length);
    console.log('📊 Services filtrés:', servicesFiltrees.length);
    
    // Calculer les totaux
    let ventesPayees = 0, ventesInstance = 0, ventesCredit = 0, totalGeneral = 0;
    
    ventesFiltrees.forEach(vente => {
        const montant = vente.total || 0;
        const statut = vente.statutPaiement;
        
        if (statut === 'paye') ventesPayees += montant;
        else if (statut === 'instance') ventesInstance += montant;
        else if (statut === 'credit') ventesCredit += montant;
        
        totalGeneral += montant;
    });
    
    servicesFiltrees.forEach(service => {
        const montant = service.montant || service.montantFinal || 0;
        const statut = service.statutPaiement;
        
        if (statut === 'paye') ventesPayees += montant;
        else if (statut === 'instance') ventesInstance += montant;
        else if (statut === 'credit') ventesCredit += montant;
        
        totalGeneral += montant;
    });
    
    console.log('💰 Totaux calculés:', {
        payees: ventesPayees,
        instance: ventesInstance,
        credit: ventesCredit,
        total: totalGeneral
    });
    
    // Mettre à jour l'interface
    const recapPayees = document.getElementById('recap-ventes-payees');
    const recapInstance = document.getElementById('recap-ventes-instance');
    const recapCredit = document.getElementById('recap-ventes-credit');
    const recapTotal = document.getElementById('recap-total-ventes');
    
    if (recapPayees) recapPayees.textContent = `${ventesPayees} DA`;
    if (recapInstance) recapInstance.textContent = `${ventesInstance} DA`;
    if (recapCredit) recapCredit.textContent = `${ventesCredit} DA`;
    if (recapTotal) recapTotal.textContent = `${totalGeneral} DA`;
    
    // Afficher les détails
    afficherDetailsRecapitulatif(ventesFiltrees, servicesFiltrees);
    
    console.log('✅ Récapitulatif généré avec succès');
}

function afficherDetailsRecapitulatif(ventesFiltrees, servicesFiltrees) {
    const tbody = document.getElementById('recap-body');
    if (!tbody) {
        console.error('❌ Élément recap-body non trouvé');
        return;
    }
    
    tbody.innerHTML = '';
    
    const toutesTransactions = [
        ...ventesFiltrees.map(v => ({ ...v, type: 'VENTE' })),
        ...servicesFiltrees.map(s => ({ ...s, type: 'SERVICE' }))
    ].sort((a, b) => new Date(a.date || a.dateFinalisation) - new Date(b.date || b.dateFinalisation));
    
    console.log('📋 Transactions à afficher:', toutesTransactions.length);
    
    if (toutesTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Aucune transaction pour la période sélectionnée</td></tr>`;
        return;
    }
    
    toutesTransactions.forEach(transaction => {
        const tr = document.createElement('tr');
        const isVente = transaction.type === 'VENTE';
        
        let description = '';
        let montant = 0;
        
        if (isVente) {
            description = `${transaction.produits?.length || 0} produit(s)`;
            montant = transaction.total || 0;
        } else {
            description = transaction.description || transaction.nom || 'Service';
            montant = transaction.montant || transaction.montantFinal || 0;
        }
        
        tr.innerHTML = `
            <td>${new Date(transaction.date || transaction.dateFinalisation).toLocaleString('fr-FR')}</td>
            <td>${transaction.type}</td>
            <td>${description}</td>
            <td>${montant} DA</td>
            <td>${transaction.client || '-'}</td>
            <td>${getBadgeStatutPaiement(transaction.statutPaiement)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('✅ Détails du récapitulatif affichés');
}

function purgerRecapitulatif() {
    if (!SessionManager.aDroit('purge_recapitulatif')) {
        alert('❌ Droits administrateur requis');
        return;
    }
    
    if (confirm('🗑️ Purger les données du récapitulatif ?\n\nCette action va supprimer toutes les transactions historiques mais conserver le stock actuel.')) {
        historiqueVentes = [];
        historiqueServices = [];
        SauvegardeManager.sauvegarderDonnees();
        genererRecapitulatif();
        alert('✅ Récapitulatif purgé');
    }
}

// ==============================================
// CONFIGURATION DES SERVICES
// ==============================================

function afficherModalConfigServices() {
    if (!SessionManager.aDroit('gestion_services')) {
        alert('❌ Droits administrateur requis');
        return;
    }
    
    const modal = document.getElementById('config-services-modal');
    const liste = document.getElementById('config-services-liste');
    
    if (modal && liste) {
        let html = '';
        
        Object.entries(servicesConfig).forEach(([typeService, services]) => {
            html += `
                <div class="param-section">
                    <h3>${getIconeService(typeService)} ${getNomService(typeService)}</h3>
                    <div class="services-liste">
            `;
            
            services.forEach((service, index) => {
                html += `
                    <div class="service-config-item">
                        <input type="text" value="${service.nom}" 
                               onchange="modifierNomService('${typeService}', ${index}, this.value)"
                               placeholder="Nom du service">
                        <input type="number" value="${service.prix}" min="0" step="1"
                               onchange="modifierPrixService('${typeService}', ${index}, this.value)"
                               placeholder="Prix">
                        <button class="btn-danger" onclick="supprimerService('${typeService}', ${index})">❌</button>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <button class="btn-primary" onclick="ajouterService('${typeService}')">
                        ➕ Ajouter un service
                    </button>
                </div>
            `;
        });
        
        liste.innerHTML = html;
        modal.style.display = 'flex';
    }
}

function fermerModalConfigServices() {
    const modal = document.getElementById('config-services-modal');
    if (modal) modal.style.display = 'none';
}

function getIconeService(typeService) {
    const icones = {
        'impression': '🖨️',
        'photocopie': '📄',
        'inscription': '📝',
        'web': '🌐',
        'scan': '📷',
        'saisie': '⌨️',
        'informatique': '💻',
        'autre': '🔧'
    };
    return icones[typeService] || '🔧';
}

function getNomService(typeService) {
    const noms = {
        'impression': 'Impression',
        'photocopie': 'Photocopie',
        'inscription': 'Inscriptions',
        'web': 'Services Web',
        'scan': 'Scan',
        'saisie': 'Saisie',
        'informatique': 'Informatique',
        'autre': 'Autres Services'
    };
    return noms[typeService] || 'Service';
}

function ajouterService(typeService) {
    if (!servicesConfig[typeService]) {
        servicesConfig[typeService] = [];
    }
    
    servicesConfig[typeService].push({
        nom: 'Nouveau service',
        prix: 0
    });
    
    SauvegardeManager.sauvegarderDonnees();
    afficherModalConfigServices();
}

function supprimerService(typeService, index) {
    if (servicesConfig[typeService] && servicesConfig[typeService][index]) {
        if (confirm('Supprimer ce service ?')) {
            servicesConfig[typeService].splice(index, 1);
            SauvegardeManager.sauvegarderDonnees();
            afficherModalConfigServices();
        }
    }
}

function modifierNomService(typeService, index, nouveauNom) {
    if (servicesConfig[typeService] && servicesConfig[typeService][index]) {
        servicesConfig[typeService][index].nom = nouveauNom;
        SauvegardeManager.sauvegarderDonnees();
    }
}

function modifierPrixService(typeService, index, nouveauPrix) {
    const prix = parseFloat(nouveauPrix);
    if (!isNaN(prix) && servicesConfig[typeService] && servicesConfig[typeService][index]) {
        servicesConfig[typeService][index].prix = prix;
        SauvegardeManager.sauvegarderDonnees();
    }
}

// ==============================================
// GESTION DES TICKETS
// ==============================================

function genererTicketCaissePreview() {
    if (panier.length === 0) {
        alert('❌ Panier vide - Aucun ticket à visualiser');
        return;
    }
    
    const total = recalculerTotalGeneral();
    let ticketContent = `🎫 TICKET DE CAISSE\n`;
    ticketContent += `Date: ${new Date().toLocaleString('fr-FR')}\n`;
    ticketContent += `Vendeur: ${SessionManager.currentUser}\n`;
    ticketContent += `\n--- PRODUITS ---\n`;
    
    panier.forEach(item => {
        const totalProduit = calculerTotalAvecRemise(item);
        ticketContent += `${item.designation}\n`;
        ticketContent += `  ${item.quantite} x ${item.prix} DA = ${item.total} DA`;
        
        if (item.remise && item.remise > 0) {
            ticketContent += ` - Remise: ${item.remise} ${item.typeRemise} = ${totalProduit} DA`;
        }
        ticketContent += `\n`;
    });
    
    ticketContent += `\n--- TOTAUX ---\n`;
    ticketContent += `Sous-total: ${panier.reduce((sum, item) => sum + (item.total || 0), 0)} DA\n`;
    
    if (remiseGlobale.active) {
        ticketContent += `Remise globale: -${remiseGlobale.valeur} DA\n`;
    }
    
    ticketContent += `TOTAL: ${total} DA\n`;
    ticketContent += `\nMerci de votre visite !`;
    
    alert(ticketContent);
}

function imprimerTicketVente() {
    if (panier.length === 0) {
        alert('❌ Panier vide - Aucun ticket à imprimer');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const total = recalculerTotalGeneral();
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket de Caisse</title>
            <style>
                body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
                .ticket { width: 80mm; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 10px; }
                .produit { margin: 5px 0; }
                .total { font-weight: bold; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="header">
                    <h2>🎫 CYBERGESTION</h2>
                    <p>${new Date().toLocaleString('fr-FR')}</p>
                    <p>Vendeur: ${SessionManager.currentUser}</p>
                </div>
                
                <div class="produits">
                    <h3>PRODUITS:</h3>
                    ${panier.map(item => {
                        const totalProduit = calculerTotalAvecRemise(item);
                        return `
                            <div class="produit">
                                <strong>${item.designation}</strong><br>
                                ${item.quantite} x ${item.prix} DA = ${item.total} DA
                                ${item.remise && item.remise > 0 ? 
                                    ` (Remise: ${item.remise} ${item.typeRemise} = ${totalProduit} DA)` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="total">
                    <p>Sous-total: ${panier.reduce((sum, item) => sum + (item.total || 0), 0)} DA</p>
                    ${remiseGlobale.active ? `<p>Remise globale: -${remiseGlobale.valeur} DA</p>` : ''}
                    <p><strong>TOTAL: ${total} DA</strong></p>
                </div>
                
                <div class="footer" style="text-align: center; margin-top: 15px;">
                    <p>Merci de votre visite !</p>
                </div>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

function imprimerTicketServices() {
    if (panierServices.length === 0) {
        alert('❌ Aucun service à imprimer');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const total = panierServices.reduce((sum, service) => sum + (service.montantFinal || service.montant || 0), 0);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket Services</title>
            <style>
                body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
                .ticket { width: 80mm; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 10px; }
                .service { margin: 5px 0; }
                .total { font-weight: bold; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="header">
                    <h2>🔧 SERVICES</h2>
                    <p>${new Date().toLocaleString('fr-FR')}</p>
                    <p>Vendeur: ${SessionManager.currentUser}</p>
                </div>
                
                <div class="services">
                    <h3>SERVICES:</h3>
                    ${panierServices.map(service => `
                        <div class="service">
                            <strong>${service.nom}</strong><br>
                            ${service.description ? `${service.description}<br>` : ''}
                            ${service.quantite || 1} x ${service.montant} DA = ${service.montantFinal || service.montant} DA
                        </div>
                    `).join('')}
                </div>
                
                <div class="total">
                    <p><strong>TOTAL: ${total} DA</strong></p>
                </div>
                
                <div class="footer" style="text-align: center; margin-top: 15px;">
                    <p>Merci pour votre confiance !</p>
                </div>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// ==============================================
// FONCTIONS UTILITAIRES
// ==============================================

function configurerValidationClavierComplete() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-product');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            SauvegardeManager.sauvegarderDonnees();
            alert('💾 Données sauvegardées!');
        }
        
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            location.reload();
        }
    });
}

function reinitialiserFormulaireService() {
    document.getElementById('service-description').value = '';
    document.getElementById('service-amount').value = '0';
    document.getElementById('service-client').value = '';
    document.querySelectorAll('.service-card').forEach(card => card.classList.remove('active'));
}
/* ========== ACCORDION HISTORIQUE AVEC BOUTONS RETOUR/ÉCHANGE ========== */
function toggleDetail(id) {
  const row = document.getElementById('detail-' + id);
  if (!row) return;
  row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

// Fonction pour ouvrir le modal de retour produit
function ouvrirModalRetourProduit(venteIndex, produitIndex) {
    const vente = historiqueVentes[venteIndex];
    const produit = vente.produits[produitIndex];
    
    if (!vente || !produit) return;
    
    // Stocker les indices pour la confirmation
    document.getElementById('modal-retour-vente-index').value = venteIndex;
    document.getElementById('modal-retour-produit-index').value = produitIndex;
    document.getElementById('modal-retour-produit-nom').textContent = produit.designation;
    document.getElementById('modal-retour-quantite-max').textContent = produit.quantite;
    document.getElementById('modal-retour-quantite').max = produit.quantite;
    document.getElementById('modal-retour-quantite').value = produit.quantite;
    
    // Ouvrir le modal
    document.getElementById('modal-retour-produit').style.display = 'flex';
}

// Fonction pour ouvrir le modal d'échange produit
function ouvrirModalEchangeProduit(venteIndex, produitIndex) {
    const vente = historiqueVentes[venteIndex];
    const produit = vente.produits[produitIndex];
    
    if (!vente || !produit) return;
    
    // Stocker les indices pour la confirmation
    document.getElementById('modal-echange-vente-index').value = venteIndex;
    document.getElementById('modal-echange-produit-index').value = produitIndex;
    document.getElementById('modal-echange-produit-actuel').textContent = 
        `${produit.designation} (${produit.quantite}x ${produit.prix} DA)`;
    
    // Stocker aussi l'ancien produit pour calcul différence
    document.getElementById('modal-echange-produit-actuel').dataset.ancienPrix = produit.prix;
    document.getElementById('modal-echange-produit-actuel').dataset.ancienQuantite = produit.quantite;
    
    // Réinitialiser la sélection
    document.getElementById('produit-echange-selectionne').value = '';
    document.getElementById('section-produit-selectionne').style.display = 'none';
    document.getElementById('btn-confirmer-echange').disabled = true;
    
    // Réinitialiser différence prix
    document.getElementById('section-difference-prix').style.display = 'none';
    
    // Réinitialiser la recherche
    document.getElementById('recherche-echange-produit').value = '';
    afficherProduitsPourEchange();
    
    // Activer la gestion clavier
    document.addEventListener('keydown', gestionClavierEchange);
    
    // Ouvrir le modal
    document.getElementById('modal-echange-produit').style.display = 'flex';
    
    // Focus sur la recherche
    setTimeout(() => {
        document.getElementById('recherche-echange-produit').focus();
    }, 100);
}

function selectionnerProduitEchange(codeProduit) {
    // Retirer le surlignage précédent
    document.querySelectorAll('#liste-produits-echange tr').forEach(tr => {
        tr.classList.remove('ligne-selectionnee');
        tr.style.background = 'none';
        tr.style.color = '';
        
        // Réinitialiser les boutons (carré vide)
        const btn = tr.querySelector('button');
        if (btn) {
            btn.textContent = '□ Sélectionner';
            btn.className = 'btn-primary';
        }
    });
    
    // Appliquer le surlignage à la nouvelle ligne
    const lignes = document.querySelectorAll('#liste-produits-echange tr');
    const ligneSelectionnee = Array.from(lignes).find(tr => 
        tr.textContent.includes(codeProduit)
    );
    
    if (ligneSelectionnee) {
        ligneSelectionnee.classList.add('ligne-selectionnee');
        ligneSelectionnee.style.background = 'var(--accent-color)';
        ligneSelectionnee.style.color = 'white';
        
        // Mettre à jour le bouton (coche verte)
        const btn = ligneSelectionnee.querySelector('button');
        if (btn) {
            btn.textContent = '✅ Sélectionné !';
            btn.className = 'btn-success';
        }
    }
    
    // Calculer la différence de prix
    const ancienProduitPrix = parseFloat(document.getElementById('modal-echange-produit-actuel').dataset.ancienPrix);
    const ancienProduitQuantite = parseInt(document.getElementById('modal-echange-produit-actuel').dataset.ancienQuantite);
    const nouveauProduit = stockData.find(p => p['CODE-BR'] === codeProduit);
    
    if (nouveauProduit && ancienProduitPrix) {
        const ancienTotal = ancienProduitPrix * ancienProduitQuantite;
        const nouveauTotal = nouveauProduit['PRIX-U'] * ancienProduitQuantite;
        const différence = nouveauTotal - ancienTotal;
        
        // Afficher la différence
        afficherDifferencePrix(différence);
    }
    
    // Mettre à jour la sélection et afficher la section
    document.getElementById('produit-echange-selectionne').value = codeProduit;
    document.getElementById('section-produit-selectionne').style.display = 'block';
    document.getElementById('btn-confirmer-echange').disabled = false;
    
    // Afficher le produit sélectionné avec badge
    const produit = stockData.find(p => p['CODE-BR'] === codeProduit);
    if (produit) {
        document.getElementById('produit-echange-nom').innerHTML = 
            `<strong>${produit.DESIGNATION}</strong> (${produit['PRIX-U']} DA) <span class="badge-selectionne">✅ Sélectionné</span>`;
    }
}

function afficherDifferencePrix(difference) {
    const sectionDifference = document.getElementById('section-difference-prix');
    const divPositif = document.getElementById('difference-positif');
    const divNegatif = document.getElementById('difference-negatif');
    const divNulle = document.getElementById('difference-nulle');
    
    // Afficher la section
    sectionDifference.style.display = 'block';
    
    // Cacher toutes les divs d'état
    divPositif.style.display = 'none';
    divNegatif.style.display = 'none';
    divNulle.style.display = 'none';
    
    if (difference > 0) {
        // Supplément à payer
        divPositif.style.display = 'block';
        document.getElementById('montant-supplement').textContent = Math.abs(difference);
    } else if (difference < 0) {
        // Remboursement
        divNegatif.style.display = 'block';
        document.getElementById('montant-remboursement').textContent = Math.abs(difference);
    } else {
        // Montants identiques
        divNulle.style.display = 'block';
    }
}

function confirmerEchangeProduit() {
    const venteIndex = parseInt(document.getElementById('modal-echange-vente-index').value);
    const produitIndex = parseInt(document.getElementById('modal-echange-produit-index').value);
    const codeNouveauProduit = document.getElementById('produit-echange-selectionne').value;
    
    const vente = historiqueVentes[venteIndex];
    const ancienProduit = vente.produits[produitIndex];
    const nouveauProduit = stockData.find(p => p['CODE-BR'] === codeNouveauProduit);
    
    if (!vente || !ancienProduit || !nouveauProduit) {
        alert('❌ Produit de remplacement invalide');
        return;
    }
    
    if (nouveauProduit.QUANTITE < ancienProduit.quantite) {
        alert(`❌ Stock insuffisant! Disponible: ${nouveauProduit.QUANTITE}, Demandé: ${ancienProduit.quantite}`);
        return;
    }
    
    // Calculer la différence pour le message de confirmation
    const ancienTotal = ancienProduit.prix * ancienProduit.quantite;
    const nouveauTotal = nouveauProduit['PRIX-U'] * ancienProduit.quantite;
    const difference = nouveauTotal - ancienTotal;
    
    let messageDifference = '';
    if (difference > 0) {
        messageDifference = `\n💰 SUPPLEMENT À PAYER : +${difference} DA`;
    } else if (difference < 0) {
        messageDifference = `\n💰 REMBOURSEMENT : ${difference} DA`;
    } else {
        messageDifference = `\n⚖️ MONTANTS IDENTIQUES`;
    }
    
    if (confirm(`🔄 Échanger ${ancienProduit.quantite} ${ancienProduit.designation} contre ${ancienProduit.quantite} ${nouveauProduit.DESIGNATION} ?${messageDifference}`)) {
        // Rétablir l'ancien produit en stock
        const ancienProduitStock = stockData.find(p => p['CODE-BR'] === ancienProduit.code);
        if (ancienProduitStock) {
            ancienProduitStock.QUANTITE += ancienProduit.quantite;
        }
        
        // Réduire le stock du nouveau produit
        nouveauProduit.QUANTITE -= ancienProduit.quantite;
        
        // Remplacer le produit dans la vente
        vente.produits[produitIndex] = {
            designation: nouveauProduit.DESIGNATION,
            code: nouveauProduit['CODE-BR'],
            quantite: ancienProduit.quantite,
            prix: nouveauProduit['PRIX-U'],
            total: ancienProduit.quantite * nouveauProduit['PRIX-U'],
            remise: 0,
            typeRemise: 'DA'
        };
        
        // Recalculer le total de la vente
        vente.total = vente.produits.reduce((sum, p) => sum + p.total, 0);
        
        // Sauvegarder et mettre à jour l'affichage
        SauvegardeManager.sauvegarderDonnees();
        afficherHistoriqueVentes();
        afficherStock();
        
        fermerModalEchangeProduit();
        alert('✅ Échange produit effectué avec succès!');
    }
}

function afficherProduitsPourEchange() {
    const tbody = document.getElementById('liste-produits-echange');
    const recherche = document.getElementById('recherche-echange-produit').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    const produitsFiltres = stockData.filter(produit => 
        produit.QUANTITE > 0 && 
        produit.DESIGNATION.toLowerCase().includes(recherche)
    );
    
    if (produitsFiltres.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">Aucun produit trouvé</td></tr>';
        return;
    }
    
    produitsFiltres.forEach((produit) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.style.transition = 'all 0.2s ease';
        
        tr.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${produit.DESIGNATION}</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${produit['CODE-BR']}</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: center;">${produit.QUANTITE}</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: right;">${produit['PRIX-U']} DA</td>
            <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: center;">
                <button class="btn-primary" onclick="selectionnerProduitEchange('${produit['CODE-BR']}')" 
                        style="padding: 6px 12px; font-size: 0.8rem; white-space: nowrap;">
                    □ Sélectionner
                </button>
            </td>
        `;
        
        // Clic simple = sélectionner
        tr.addEventListener('click', () => {
            selectionnerProduitEchange(produit['CODE-BR']);
        });
        
        // Double-clic = sélectionner + confirmer direct
        tr.addEventListener('dblclick', () => {
            selectionnerProduitEchange(produit['CODE-BR']);
            setTimeout(() => {
                if (document.getElementById('produit-echange-selectionne').value) {
                    confirmerEchangeProduit();
                }
            }, 100);
        });
        
        // Surlignage au survol
        tr.addEventListener('mouseenter', () => {
            if (!tr.classList.contains('ligne-selectionnee')) {
                tr.style.background = 'rgba(52, 152, 219, 0.1)';
            }
        });
        
        tr.addEventListener('mouseleave', () => {
            if (!tr.classList.contains('ligne-selectionnee')) {
                tr.style.background = 'none';
            }
        });
        
        tbody.appendChild(tr);
    });
}

function gestionClavierEchange(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const produitSelectionne = document.getElementById('produit-echange-selectionne').value;
        if (produitSelectionne) {
            confirmerEchangeProduit();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        fermerModalEchangeProduit();
    }
}

function fermerModalEchangeProduit() {
    // Désactiver la gestion clavier
    document.removeEventListener('keydown', gestionClavierEchange);
    
    // Fermer le modal
    document.getElementById('modal-echange-produit').style.display = 'none';
}

// Fonctions de fermeture des modals
function fermerModalRetourProduit() {
    document.getElementById('modal-retour-produit').style.display = 'none';
}

function fermerModalEchangeProduit() {
    document.getElementById('modal-echange-produit').style.display = 'none';
}
function debugRecapitulatif() {
    console.log('🐛 DEBUG RÉCAPITULATIF:', {
        historiqueVentes: historiqueVentes.length,
        historiqueServices: historiqueServices.length,
        stockData: stockData.length,
        panier: panier.length,
        panierServices: panierServices.length
    });
    
    alert(`🐛 DEBUG RÉCAPITULATIF:
• Ventes: ${historiqueVentes.length}
• Services: ${historiqueServices.length}
• Stock: ${stockData.length}
• Panier: ${panier.length}
• Panier Services: ${panierServices.length}`);
}

// ==============================================
// INITIALISATION
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation CyberGestion...');
    
    SessionManager.init();
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    window.addEventListener('beforeunload', function() {
        SauvegardeManager.sauvegarderDonnees();
    });
    
    console.log('✅ CyberGestion initialisé avec succès');
});