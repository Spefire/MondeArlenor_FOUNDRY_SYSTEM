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

export async function rollSkill(actor, caractKey, skillKey, powerId, bonusMalus) {

  // Re-calculate health levels
  const race = actor.data.data.race;
  const races = actor.data.data.races;
  const injured = actor.data.data.healthLevels.injured;
  const seriously = actor.data.data.healthLevels.seriously;
  const underdeath = actor.data.data.healthLevels.underdeath;
  const health = actor.data.data.health;
  const caracts = actor.data.data.caracts;

  injured.max = 2;
  seriously.max = 2;
  underdeath.max = 2;

  if (race) {
    if (race === races[1].code
      || race === races[4].code) {
      seriously.max = 1;
    }
    if (race === races[2].code
      || race === races[5].code) {
      seriously.max = 3;
    }
  }

  let caract = caracts[caractKey].value;
  if (health.value < underdeath.max) {
    caract += -3;
  } else if (health.value < underdeath.max + seriously.max) {
    caract += -2;
  } else if (health.value < underdeath.max + seriously.max + injured.max) {
    caract += -1;
  }

  // Create rolling command
  let label = caracts[caractKey].name;
  let rollCmd = "" + caract + "d6";
  if (skillKey !== null && skillKey !== undefined) {
    const skills = actor.data.data.skills;
    let skill = skills[skillKey].value;
    label = skills[skillKey].name + " (" + caractKey + ")";
    if (skill === 0) skill = -4;
    rollCmd += "+" + skill;
  }
  if (powerId !== null && powerId !== undefined) {
    let powerItem = null;
    for (let i of actor.data.items) {
      if (i.type === 'power' && i.id === powerId) {
        powerItem = i;
      }
    }
    if (powerItem) {
      label = powerItem.name;
    } else {
      console.error("Pouvoir non disponible");
      return;
    }
  }
  if (bonusMalus !== null && bonusMalus !== undefined && bonusMalus !== 0) {
    if (bonusMalus.indexOf('-4') === 0) label += " avec malus";
    if (bonusMalus.indexOf('+4') === 0) label += " avec bonus";
    rollCmd += "+" + bonusMalus;
  }

  // Roll once
  let roll = new Roll(rollCmd, {});
  let rollLabel = `Lance <b>${label}</b>`;
  roll = await roll.roll({ async: true });

  if (caract !== 0 && roll.dice[0].total === caract) {
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: rollLabel + " : Echec critique"
    });
  }
  else {
    if (caract !== 0 && roll.dice[0].total === caract * 6) {
      let rollSuccess = new Roll("1d6", {});
      rollSuccess = await rollSuccess.roll({ async: true });

      const opePlus = new OperatorTerm();
      opePlus.operator = "+";
      opePlus._evaluated = true;

      roll.terms.push(opePlus);
      roll.terms.push(rollSuccess.terms[0]);
      roll._formula = roll.formula;
      roll._total = roll.total + rollSuccess.total;

      rollLabel = rollLabel + " : Succès critique";
    }

    /*
    - Action simple : Difficulté 6.
    - Action complexe : Difficulté 14.
    - Action difficile : Difficulté 20.
    - Action épique : Difficulté 30 et plus.
    */

    if (roll._total >= 30) {
      rollLabel = rollLabel + ". <br/>Jet réussi si action : <b>Epique</b>."
    } else if (roll._total >= 20) {
      rollLabel = rollLabel + ". <br/>Jet réussi si action : <b>Difficile</b>."
    } else if (roll._total >= 14) {
      rollLabel = rollLabel + ". <br/>Jet réussi si action : <b>Complexe</b>."
    } else if (roll._total >= 6) {
      rollLabel = rollLabel + ". <br/>Jet réussi si action : <b>Simple</b>."
    } else {
      rollLabel = rollLabel + ". <br/>Jet <b>raté</b>."
    }

    roll._formula = roll._formula.replaceAll('  ', ' ');
    roll._formula = roll._formula.replaceAll('+ -', '-');
    roll._formula = roll._formula.replaceAll('+ +', '+');

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: rollLabel
    });
  }
}