// Import Modules
import { ArlenorActor } from "./actor/actor.js";
import { ArlenorActorSheet } from "./actor/actor-sheet.js";
import { ArlenorItem } from "./item/item.js";
import { ArlenorItemSheet } from "./item/item-sheet.js";
import difficulties from "./../models/difficulties.json" assert { type: "json" };
import results from "./../models/results.json" assert { type: "json" };

Hooks.once('init', async function () {

  game.arlenor = {
    ArlenorActor,
    ArlenorItem,
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d6 + @caracts.hab.value + @caracts.int.value",
    decimals: 2
  };

  // Define custom Entity classes
  CONFIG.Actor.documentClass = ArlenorActor;
  CONFIG.Item.documentClass = ArlenorItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("arlenor", ArlenorActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("arlenor", ArlenorItemSheet, { makeDefault: true });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function () {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function (str) {
    if (!str) return "";
    return str.toLowerCase();
  });

  Handlebars.registerHelper('codeToName', function (objs, code) {
    let libelle = "";
    if (!objs || objs.length === 0) return code;
    objs.forEach(obj => {
      if (obj.code === code) libelle = obj.name;
    });
    return libelle;
  });

  Handlebars.registerHelper('codeToDescription', function (objs, code) {
    let libelle = "";
    if (!objs || objs.length === 0) return code;
    objs.forEach(obj => {
      if (obj.code === code) libelle = obj.description;
    });
    return libelle;
  });

  Handlebars.registerHelper('convertToPlain', function (str) {
    if (!str) return "Aucune description";
    return convertToPlain(str);
  });
});

/* -------------------------------------------- */
/*  Roll for Arlenor                            */
/* -------------------------------------------- */

export async function rollSkill(data) {

  const templateDialog = await renderTemplate("systems/arlenor/templates/roll-dialog.hbs",
    {
      ...data,
      bonusMalus: "0",
      difficulty: "STANDARD"
    });

  new Dialog({
    title: "Configuration du lancé de dés",
    content: templateDialog,
    buttons: {
      button1: {
        label: "Lancer les dés",
        callback: (html) => myCallback(html),
        icon: `<i class="fas fa-dice"></i>`
      }
    }
  }).render(true);

  async function myCallback(html) {
    const difficulty = html.find("select#rollDifficulty").val();
    const bonusMalus = html.find("select#rollBonusMalus").val();
    // ui.notifications.info(`rollDifficulty: ${difficulty} / rollBonusMalus: ${bonusMalus}`);

    // Create rolling command...
    let rollTitle = "";
    let rollImage = "";
    let rollDescription = "";

    // Get the power
    if (data.powerId !== null && data.powerId !== undefined) {
      let powerItem = null;
      for (let i of data.actor.powers) {
        if (i.id === data.powerId) powerItem = i;
      }
      for (let i of data.actor.otherPowers) {
        if (i.id === data.powerId) powerItem = i;
      }
      if (powerItem) {
        rollTitle = powerItem.name;
        rollImage = powerItem.img;
        rollDescription = convertToPlain(powerItem.system.description);
      } else {
        console.error("Pouvoir non disponible");
        return;
      }
    }
    // Or get the caract
    else {
      rollTitle = data.caractName;
      rollImage = "systems/arlenor/assets/icons/" + data.caractKey + ".png";
    }

    // Get the bonus/malus
    let bonusMalusValue = parseInt(bonusMalus, 10);

    // Rolling...
    const rollCmd = (bonusMalusValue !== 0) ? "(" + data.caractValue + " + " + bonusMalusValue + ")D6" : "" + data.caractValue + "D6";
    let roll = new Roll(rollCmd, {});
    roll = await roll.roll({ async: true });
    const rollValues = roll.dice[0].values;

    // Calcul du résultat
    const nbReussites = rollValues.filter(value => value > 3).length;
    const maxValue = Math.max(...rollValues);
    const numDifficulty = difficulties.find(diff => diff.code === difficulty)?.value;
    const isReussite = nbReussites >= numDifficulty;

    let rollResult = "";
    if (numDifficulty === 1) {
      if (maxValue === 6) rollResult = "RES_CRITIQUE";
      else if (maxValue === 5) rollResult = "RES_SIMPLE";
      else if (maxValue === 4) rollResult = "RES_COUT";
      else if (maxValue === 3) rollResult = "ECHEC_SIMPLE";
      else if (maxValue === 2) rollResult = "ECHEC_CONSEQ";
      else rollResult = "ECHEC_CRITIQUE";
    } else if (!isReussite) {
      if (maxValue === 6 || maxValue === 5) rollResult = "ECHEC_SIMPLE";
      else if (maxValue === 4 || maxValue === 3) rollResult = "ECHEC_CONSEQ";
      else rollResult = "ECHEC_CRITIQUE";
    } else {
      if (maxValue === 4) rollResult = "RES_COUT";
      else if (maxValue === 5) rollResult = "RES_SIMPLE";
      else rollResult = "RES_CRITIQUE";
    }

    const templateMessage = await renderTemplate("systems/arlenor/templates/roll-message.hbs",
      {
        ...data,
        bonusMalus,
        difficulty,
        results,
        rollTitle,
        rollDescription,
        rollImage,
        rollCmd,
        rollResult,
        rollValues,
        roll,
      });

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: data.actor }),
      content: templateMessage,
    });
  }
}

function convertHTMLToText(html) {
  html = html.replace(/<style([\s\S]*?)<\/style>/gi, '');
  html = html.replace(/<script([\s\S]*?)<\/script>/gi, '');
  html = html.replace(/<\/div>/ig, '\n');
  html = html.replace(/<\/li>/ig, '\n');
  html = html.replace(/<li>/ig, '  *  ');
  html = html.replace(/<\/ul>/ig, '\n');
  html = html.replace(/<\/p>/ig, '\n');
  html = html.replace(/<br\s*[\/]?>/gi, "\n");
  html = html.replace(/<[^>]+>/ig, '');
  return html;
}

function convertToPlain(html) {
  // Create a new div element
  var tempDivElement = document.createElement("div");

  // Set the HTML content with the given value
  tempDivElement.innerHTML = html;

  const textPlain = (tempDivElement.textContent || tempDivElement.innerText || "").toString();
  if (textPlain?.length > 400) textPlain = textPlain.slice(0, 400);

  tempDivElement.remove();

  // Retrieve the text property of the element 
  return textPlain;
}