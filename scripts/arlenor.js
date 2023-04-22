// Import Modules
import { ArlenorActor } from "./actor/actor.js";
import { ArlenorActorSheet } from "./actor/actor-sheet.js";
import { ArlenorItem } from "./item/item.js";
import { ArlenorItemSheet } from "./item/item-sheet.js";

Hooks.once('init', async function () {

  game.arlenor = {
    ArlenorActor,
    ArlenorItem,
    rollArlenor,
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

  Handlebars.registerHelper('codeToLibelle', function (objs, code) {
    let libelle = "";
    if (!objs || objs.length === 0) return code;
    objs.forEach(obj => {
      if (obj.code === code) libelle = obj.name;
    });
    return libelle;
  });
});

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  // Hooks.on("hotbarDrop", (bar, data, slot) => createArlenorMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
/*async function createArlenorMacro(data, slot) {
  if (data.type !== "Item") return false;
  if (!("data" in data)) return ui.notifications.warn("Ce n'est pas les données d'un objet.");
  const item = data.data;
  if (item.type !== "power") return ui.notifications.warn("Ce n'est pas un pouvoir.");

  // Create the macro command
  const command = `game.arlenor.rollArlenor('pou', null, '${item.id}');`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "arlenor.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}*/

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

function rollArlenor(caractKey, skillKey, powerId) {
  /*const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  if (!actor) actor = game.actors.find(act => act.isOwner);
  if (actor) rollSkill(actor, caractKey, skillKey, powerId, 0);
  else console.error("Il n'y a pas de personnage valide.");*/
}

export async function rollSkill(data) {

  const myContent = await renderTemplate("systems/arlenor/templates/roll-dialog.hbs", 
    {
      ...data,
      bonusMalus: "0",
      difficulty: "STANDARD"
    });

  new Dialog({
    title: "Configuration du lancé de dés",
    content: myContent,
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
    let label = data.caractName;

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
        label = powerItem.name;
      } else {
        console.error("Pouvoir non disponible");
        return;
      }
    }

    // Get the bonus/malus
    let bonusMalusValue = parseInt(bonusMalus, 10);
    
    // Rolling...
    let rollCmd = (bonusMalusValue !== 0) ? "(" + data.caractValue + " + " + bonusMalusValue + ")D6" : "" + data.caractValue + "D6";
    let roll = new Roll(rollCmd, {});
    let rollLabel = `Lance <b>${label}</b> avec une difficulté (` + difficulty + `)`;
    roll = await roll.roll({ async: true });

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: data.actor }),
      flavor: rollLabel
    });
  }
}