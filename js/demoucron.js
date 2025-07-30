
    // Variables globales
    let sommets = [];
    let arcs = [];
    let matriceFinaleGlobale = null;
    let network = null;
    let D = [];
    
     let dernierChemin = []; // Stocke le dernier chemin trouvé
    let etapesIntermediaires = []; // Matrice de distances

    // Fonctions d'interface
    function ajouterSommet() {
      const nom = document.getElementById("sommetInput").value.trim().toUpperCase();
      if (nom && !sommets.includes(nom)) {
        sommets.push(nom);
        document.getElementById("sommetInput").value = "";
        mettreAJourInterface();
        dessinerGraphe();
      } else if (sommets.includes(nom)) {
        alert("Ce sommet existe déjà !");
      }
    }

    function mettreAJourInterface() {
      const selects = ["arcDepart", "arcArrivee", "cheminDepart", "cheminArrivee"];
      selects.forEach(id => {
        const select = document.getElementById(id);
        const currentValue = select.value;
        select.innerHTML = `<option value="">${id.includes('arc') ? (id.includes('Depart') ? 'Départ' : 'Arrivée') : (id.includes('Depart') ? 'Sommet départ' : 'Sommet arrivée')}</option>`;
        sommets.forEach(s => {
          select.innerHTML += `<option value="${s}">${s}</option>`;
        });
        if (sommets.includes(currentValue)) select.value = currentValue;
      });

      const sommetsList = document.getElementById("sommetsList");
      sommetsList.innerHTML = "";
      sommets.forEach((s, index) => {
        sommetsList.innerHTML += `
          <span class="badge bg-primary me-1">
            ${s} <button class="btn-close btn-close-white ms-1" style="font-size: 0.7em;" onclick="supprimerSommet(${index})"></button>
          </span>`;
      });
    }

    function supprimerSommet(index) {
      const sommet = sommets[index];
      arcs = arcs.filter(arc => arc.depart !== sommet && arc.arrivee !== sommet);
      sommets.splice(index, 1);
      mettreAJourInterface();
      afficherArcs();
      dessinerGraphe();
    }

    function ajouterArc() {
      const depart = document.getElementById("arcDepart").value;
      const arrivee = document.getElementById("arcArrivee").value;
      const poids = parseFloat(document.getElementById("arcValeur").value);

      if (!depart || !arrivee) return alert("Veuillez sélectionner les sommets !");
      if (isNaN(poids)) return alert("Veuillez entrer un poids valide !");
      if (depart === arrivee) return alert("Un arc ne peut pas être une boucle !");

      const arcExistant = arcs.find(arc => arc.depart === depart && arc.arrivee === arrivee);
      if (arcExistant) {
        if (confirm(`Un arc ${depart} → ${arrivee} existe. Le remplacer ?`)) arcExistant.poids = poids;
      } else {
        arcs.push({ depart, arrivee, poids });
      }
      document.getElementById("arcValeur").value = "";
      afficherArcs();
      dessinerGraphe();
    }

    function afficherArcs() {
      const list = document.getElementById("arcList");
      list.innerHTML = arcs.length === 0 ? "<em class='text-muted'>Aucun arc défini</em>" : "";
      arcs.forEach((arc, index) => {
        list.innerHTML += `
          <div class="d-flex justify-content-between align-items-center border-bottom py-1">
            <span><strong>${arc.depart}</strong> → <strong>${arc.arrivee}</strong> : ${arc.poids}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="supprimerArc(${index})">&times;</button>
          </div>`;
      });
    }

    function supprimerArc(index) {
      arcs.splice(index, 1);
      afficherArcs();
      dessinerGraphe();
    }

    function dessinerGraphe() {
      if (sommets.length === 0) return;
      const nodes = sommets.map(s => ({ id: s, label: s }));
      const edges = arcs.map(arc => ({ 
        from: arc.depart, 
        to: arc.arrivee, 
        label: arc.poids.toString(), 
        arrows: 'to', 
        color: { color: '#2B7CE9' } 
      }));
      const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
      const options = { 
        physics: { stabilization: false }, 
        layout: { randomSeed: 2 } 
      };
      network = new vis.Network(document.getElementById('graphContainer'), data, options);
    }

    // Algorithme de Demoucron
    function initialiserMatrice(mode) {
      const n = sommets.length;
      const valeurInfinie = mode === "min" ? Infinity : null;
      
      D = Array.from({ length: n }, () => Array(n).fill(valeurInfinie));
      
      
      
      
      // Remplir avec les arcs existants
      arcs.forEach(arc => {
        const i = sommets.indexOf(arc.depart);
        const j = sommets.indexOf(arc.arrivee);
        D[i][j] = arc.poids;
      });
    }

    function executerDemoucron() {
      if (sommets.length === 0) return alert("Ajoutez des sommets !");
      
      const mode = document.getElementById("modeSelect").value;
      const n = sommets.length;
      const container = document.getElementById("matrices");
      container.innerHTML = "";
      
      initialiserMatrice(mode);
      container.innerHTML += `<div class="step-container"><h5>Matrice initiale D₁</h5>${creerTableauMatrice(D, mode)}</div>`;

      for (let k = 0; k < n; k++) {
        let changements = false;
        let nouvelleD = JSON.parse(JSON.stringify(D));

        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const Wij = D[i][k] + D[k][j];
            let vij  ;
            
            if (mode === "min") {
              vij = Math.min(D[i][j], Wij);
            } else { 
              
                vij = Math.max(D[i][j], Wij);
              
            }
            
           
              nouvelleD[i][j] = vij;
              changements = true;
            
          }
        }

        D = nouvelleD;
        matriceFinaleGlobale = D;
        
        let titre = `Matrice D<sub>${k+2}</sub> - Via sommet ${sommets[k]}`;
        if (!changements) titre += " (aucun changement)";
        container.innerHTML += `<div class="step-container"><h5>${titre}</h5>${creerTableauMatrice(D, mode)}</div>`;
      }

      document.getElementById("matriceFinale").innerHTML = creerTableauMatrice(D, mode);
      document.getElementById("resultats").style.display = "block";
    }

     function trouverCheminSimplifie(depart, arrivee, mode) {
      const chemin = [depart];
      let courant = depart;
      etapesIntermediaires = []; // Réinitialiser les étapes
      
      // Ajouter la paire initiale
      const departIdx = sommets.indexOf(depart);
      const arriveeIdx = sommets.indexOf(arrivee);
      etapesIntermediaires.push({i: departIdx, j: arriveeIdx});
      
      while (courant !== arrivee) {
        const arc = arcs.find(a => a.depart === courant && 
          (mode === "min" 
            ? matriceFinaleGlobale[sommets.indexOf(courant)][sommets.indexOf(arrivee)] !== Infinity
            : matriceFinaleGlobale[sommets.indexOf(courant)][sommets.indexOf(arrivee)] !== null
          ));
        if (!arc) break;
        
        chemin.push(arc.arrivee);
        
        // Ajouter les paires intermédiaires au chemin
        const currentIdx = sommets.indexOf(courant);
        const nextIdx = sommets.indexOf(arc.arrivee);
        etapesIntermediaires.push({i: currentIdx, j: nextIdx});
        
        courant = arc.arrivee;
      }
      
      return chemin;
    }

    function creerTableauMatrice(mat, mode) {
      let html = `<table class="table table-bordered matrix-table table-sm"><thead><tr><th></th>`;
      sommets.forEach(s => html += `<th class="text-center">${s}</th>`);
      html += `</tr></thead><tbody>`;
      
      sommets.forEach((s, i) => {
        html += `<tr><th>${s}</th>`;
        sommets.forEach((t, j) => {
          const valeur = mat[i][j];
          let classeCellule = "text-center";
          
          // Vérifier si cette cellule fait partie du chemin
          const estEtape = etapesIntermediaires.some(etape => etape.i === i && etape.j === j);
          if (estEtape) {
            classeCellule += " highlight-step";
          }
          
          if (mode === "min") {
            html += `<td class="${classeCellule}">${valeur === Infinity ? '<span class="infinity">∞</span>' : valeur}</td>`;
          } else {
            html += `<td class="${classeCellule}">${valeur === null ? '<span class="null">0</span>' : valeur}</td>`;
          }
        });
        html += `</tr>`;
      });
      
      return html + `</tbody></table>`;
    }

    function mettreEnEvidenceChemin(chemin) {
      dessinerGraphe();
      const edges = network.body.data.edges;
      
      for (let i = 0; i < chemin.length - 1; i++) {
        const edge = edges.get({
          filter: e => e.from === chemin[i] && e.to === chemin[i+1]
        })[0];
        
        if (edge) {
          edges.update({
            id: edge.id,
            color: { color: 'red', highlight: 'red', hover: 'red' },
            width: 3,
            shadow: true
          });
        }
      }
    }

    function afficherChemin() {
      const depart = document.getElementById("cheminDepart").value;
      const arrivee = document.getElementById("cheminArrivee").value;
      const mode = document.getElementById("modeSelect").value;
      
      if (!depart || !arrivee) return alert("Veuillez sélectionner les sommets !");
      if (!matriceFinaleGlobale) return alert("Veuillez d'abord exécuter l'algorithme !");
      
      const i = sommets.indexOf(depart);
      const j = sommets.indexOf(arrivee);
      const distance = matriceFinaleGlobale[i][j];
      const cheminInfo = document.getElementById("cheminInfo");
      
      if ((mode === "min" && distance === Infinity) || (mode === "max" && distance === null)) {
        cheminInfo.innerHTML = `Pas de chemin entre ${depart} et ${arrivee}`;
      } else {
        const chemin = trouverCheminSimplifie(depart, arrivee, mode);
        mettreEnEvidenceChemin(chemin);
        cheminInfo.innerHTML = `
          <strong>Distance de ${depart} à ${arrivee}:</strong> ${distance}<br>
          <strong>Chemin trouvé:</strong> ${chemin.join(" → ")}`;
      }
      cheminInfo.style.display = "block";
    }

    function reinitialiser() {
      sommets = [];
      arcs = [];
      matriceFinaleGlobale = null;
      document.getElementById("resultats").style.display = "none";
      document.getElementById("cheminInfo").style.display = "none";
      mettreAJourInterface();
      afficherArcs();
      dessinerGraphe();
    }