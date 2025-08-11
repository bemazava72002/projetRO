// Variables globales
let sommets = [];
let arcs = [];
let matriceFinaleGlobale = null;
let network = null;
let D = [];
let P = []; // matrice des prédécesseurs

let dernierChemin = [];
let etapesIntermediaires = [];

// Met à jour l'interface
function mettreAJourInterface() {
  const selects = ["cheminDepart", "cheminArrivee", "arcDepart", "arcArrivee"];
  selects.forEach(id => {
    const select = document.getElementById(id);
    const currentValue = select.value;
    select.innerHTML = `<option value="">${id.includes('Depart') ? 'Départ' : 'Arrivée'}</option>`;
    sommets.forEach(s => {
      select.innerHTML += `<option value="${s}">${s}</option>`;
    });
    if (sommets.includes(currentValue)) select.value = currentValue;
  });
}

// Ajouter un arc (avec ajout auto des sommets)
function ajouterArc() {
  const depart = document.getElementById("arcDepart").value.trim().toUpperCase();
  const arrivee = document.getElementById("arcArrivee").value.trim().toUpperCase();
  const poids = parseFloat(document.getElementById("arcValeur").value);

  if (!depart || !arrivee) return alert("Veuillez saisir les sommets !");
  if (isNaN(poids)) return alert("Veuillez entrer un poids valide !");
  if (depart === arrivee) return alert("Un arc ne peut pas être une boucle !");

  if (!sommets.includes(depart)) sommets.push(depart);
  if (!sommets.includes(arrivee)) sommets.push(arrivee);

  const arcExistant = arcs.find(arc => arc.depart === depart && arc.arrivee === arrivee);
  if (arcExistant) {
    if (confirm(`Un arc ${depart} → ${arrivee} existe. Le remplacer ?`)) {
      arcExistant.poids = poids;
    }
  } else {
    arcs.push({ depart, arrivee, poids });
  }

  document.getElementById("arcValeur").value = "";
  document.getElementById("arcDepart").value = "";
  document.getElementById("arcArrivee").value = "";

  mettreAJourInterface();
  afficherArcs();
  dessinerGraphe();
}

// Afficher la liste des arcs
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

// Supprimer un arc
function supprimerArc(index) {
  arcs.splice(index, 1);
  afficherArcs();
  dessinerGraphe();
}

// Dessiner le graphe avec vis.js
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

// Initialiser la matrice D et la matrice P (prédécesseurs)
function initialiserMatrice(mode) {
  const n = sommets.length;
  const valeurInfinie = mode === "min" ? Infinity : -Infinity;
  D = Array.from({ length: n }, () => Array(n).fill(valeurInfinie));
  P = Array.from({ length: n }, () => Array(n).fill(null));

  arcs.forEach(arc => {
    const i = sommets.indexOf(arc.depart);
    const j = sommets.indexOf(arc.arrivee);
    D[i][j] = arc.poids;
    P[i][j] = null; // arc direct, pas d'intermédiaire
  });
}

// Algorithme de Demoucron avec calcul de P
function executerDemoucron() {
  if (sommets.length === 0) return alert("Ajoutez des arcs !");
  const mode = document.getElementById("modeSelect").value;
  const n = sommets.length;
  const container = document.getElementById("matrices");
  container.innerHTML = "";

  initialiserMatrice(mode);
  container.innerHTML += `<div class="step-container"><h5>Matrice initiale D₁</h5>${creerTableauMatrice(D, mode)}</div>`;

  for (let k = 0; k < n; k++) {
    let changements = false;
    let nouvelleD = JSON.parse(JSON.stringify(D));
    let nouvelleP = JSON.parse(JSON.stringify(P));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const Wij = D[i][k] + D[k][j];
        let vij;
        if (mode === "min") {
          vij = Math.min(D[i][j], Wij);
          if (vij !== D[i][j]) {
            nouvelleP[i][j] = k;
          }
        } else { // max
          vij = Math.max(D[i][j], Wij);
          if (vij !== D[i][j]) {
            nouvelleP[i][j] = k;
          }
        }
        nouvelleD[i][j] = vij;
        if (vij !== D[i][j]) changements = true;
      }
    }

    D = nouvelleD;
    P = nouvelleP;
    matriceFinaleGlobale = D;

    let titre = `Matrice D<sub>${k + 2}</sub> - Via sommet ${sommets[k]}`;
    if (!changements) titre += " (aucun changement)";
    container.innerHTML += `<div class="step-container"><h5>${titre}</h5>${creerTableauMatrice(D, mode)}</div>`;
  }

  document.getElementById("matriceFinale").innerHTML = creerTableauMatrice(D, mode);
  document.getElementById("resultats").style.display = "block";
}

// Reconstituer le chemin complet à partir de la matrice P
function reconstruireChemin(i, j) {
  if (P[i][j] === null) {
    return [sommets[i], sommets[j]];
  }
  const k = P[i][j];
  const chemin1 = reconstruireChemin(i, k);
  const chemin2 = reconstruireChemin(k, j);
  // fusion sans doublon
  return [...chemin1.slice(0, -1), ...chemin2];
}

// Créer le tableau HTML de la matrice
function creerTableauMatrice(mat, mode) {
  let html = `<table class="table table-bordered matrix-table table-sm"><thead><tr><th></th>`;
  sommets.forEach(s => html += `<th class="text-center">${s}</th>`);
  html += `</tr></thead><tbody>`;

  sommets.forEach((s, i) => {
    html += `<tr><th>${s}</th>`;
    sommets.forEach((t, j) => {
      const valeur = mat[i][j];
      let classeCellule = "text-center";
      const estEtape = etapesIntermediaires.some(etape => etape.i === i && etape.j === j);
      if (estEtape) classeCellule += " highlight-step";

      if (mode === "min") {
        html += `<td class="${classeCellule}">${valeur === Infinity ? '<span class="infinity">∞</span>' : valeur}</td>`;
      } else {
        html += `<td class="${classeCellule}">${valeur === -Infinity ? '<span class="null">0</span>' : valeur}</td>`;
      }
    });
    html += `</tr>`;
  });

  return html + `</tbody></table>`;
}

// Mettre en évidence un chemin
function mettreEnEvidenceChemin(chemin) {
  dessinerGraphe();
  const edges = network.body.data.edges;

  for (let i = 0; i < chemin.length - 1; i++) {
    const edge = edges.get({
      filter: e => e.from === chemin[i] && e.to === chemin[i + 1]
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

// Afficher le chemin trouvé
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

  if ((mode === "min" && distance === Infinity) || (mode === "max" && distance === -Infinity)) {
    cheminInfo.innerHTML = `Pas de chemin entre ${depart} et ${arrivee}`;
  } else {
    const chemin = reconstruireChemin(i, j);
    mettreEnEvidenceChemin(chemin);
    cheminInfo.innerHTML = `
      <strong>Distance de ${depart} à ${arrivee}:</strong> ${distance}<br>
      <strong>Chemin trouvé:</strong> ${chemin.join(" → ")}`;
  }
  cheminInfo.style.display = "block";
}

// Réinitialiser
function reinitialiser() {
  sommets = [];
  arcs = [];
  matriceFinaleGlobale = null;
  P = [];
  document.getElementById("resultats").style.display = "none";
  document.getElementById("cheminInfo").style.display = "none";
  mettreAJourInterface();
  afficherArcs();
  dessinerGraphe();
}
