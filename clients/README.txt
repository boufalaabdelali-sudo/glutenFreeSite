Coquille WhiteLabel — utilisation par client
==========================================

1) Dupliquer le depot (ou une branche) par projet client.

2) Initialiser la config en base (source de verite):
   - npm run seed:site-config
   - Puis tout personnaliser depuis /admin.html -> onglet "Apparence & contenu".
   - Le JSON branding sert de bootstrap initial si la base est vide.

3) Optionnel : pointer vers un fichier dedie avec la variable d'environnement BRANDING_PATH
   (chemin relatif a la racine du projet ou chemin absolu).

4) Base MongoDB : adapter MONGODB_URI dans .env par client (base ou cluster dedie).

5) Labels metier dynamiques:
   - Configurer itemSingular/itemPlural/catalogTitle dans l'admin.
   - Plus aucun libelle "plat" n'est fige en dur.

6) Relancer : npm start

Mode rapide pour 3 commerces (test local)
=========================================

A) Commerce 1 - GlutenFree (base: glutenfree_store)
   1. npm run init:glutenfree
   2. npm run start:glutenfree
   3. Ouvrir:
      - http://localhost:3000
      - http://localhost:3000/admin.html
   4. Connexion admin:
      - user: admin
      - password: changeme

B) Commerce 2 - Bougies (base: candles_store)
   1. Arreter le serveur courant (Ctrl+C)
   2. npm run init:candles
   3. npm run start:candles
   4. Ouvrir:
      - http://localhost:3000
      - http://localhost:3000/admin.html

C) Commerce 3 - Boulangerie (base: boulangerie_store)
   1. Arreter le serveur courant (Ctrl+C)
   2. npm run init:boulangerie
   3. npm run start:boulangerie
   4. Ouvrir:
      - http://localhost:3000
      - http://localhost:3000/admin.html

Fichiers de marque utilises:
- config/branding.glutenfree.json
- config/branding.candles.json
- config/branding.boulangerie.json

Comptes admin et roles:
- owner: peut tout faire + gerer les utilisateurs admin
- manager: commandes/produits/config
- editor: commandes/produits (lecture + edition), sans gestion utilisateurs
