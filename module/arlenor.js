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
  CONFIG.Actor.entityClass = ArlenorActor;
  CONFIG.Item.entityClass = ArlenorItem;

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
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

function rollArlenor(caractKey, skillKey, cristalKey) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  if (!actor) actor = game.actors.find(act => act.owner);
  if (actor) rollSkill(actor, caractKey, skillKey, cristalKey, 0);
  else console.error("Il n'y a pas de personnage valide.");
}

export function rollSkill(actor, caractKey, skillKey, cristalKey, bonusMalus) {
  // Re-calculate health levels
  const race = actor.data.data.attributes.race;
  const races = actor.data.data.races;
  const injured = actor.data.data.healthLevels.injured;
  const seriously = actor.data.data.healthLevels.seriously;
  const underdeath = actor.data.data.healthLevels.underdeath;
  const health = actor.data.data.health;
  const caracts = actor.data.data.caracts;

  injured.max = 2;
  seriously.max = 2;
  underdeath.max = 2;

  if (race === races[1].code
    || race === races[4].code) {
    seriously.max = 1;
  }
  if (race === races[2].code
    || race === races[5].code) {
    seriously.max = 3;
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
  let rollCmd = "(" + caract + ")d6";
  if (skillKey !== null && skillKey !== undefined) {
    const skills = actor.data.data.skills;
    let skill = skills[skillKey].value;
    label = skills[skillKey].name + " (" + caractKey + ")";
    if (skill === 0) skill = -4;
    rollCmd += "+" + skill;
  }
  if (cristalKey !== null && cristalKey !== undefined) {
    const cristals = [];
    for (let i of actor.data.items) {
      if (i.type === 'cristal') {
        cristals.push(i);
      }
    }
    let indexKey = parseInt(cristalKey, 10);
    cristals.sort(function (a, b) {
      return a._id.localeCompare(b._id);
    });
    if (indexKey < cristals.length) {
      let cristal = cristals[indexKey].data.level;
      label = cristals[indexKey].name;
      if (cristal === 0) cristal = -4;
      rollCmd += "+" + cristal;
    } else {
      console.error("Cristal non disponible");
    }
  }
  if (bonusMalus !== null && bonusMalus !== undefined && bonusMalus !== 0) {
    if (bonusMalus < 0) label += " avec malus";
    if (bonusMalus > 0) label += " avec bonus";
    rollCmd += "+" + bonusMalus;
  }

  // Roll once
  let roll = new Roll(rollCmd, {});
  let rollLabel = `Lance <b>${label}</b>`;
  roll = roll.roll();

  if (caract !== 0 && roll.results[0] === caract) {
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: rollLabel + " : Echec critique"
    });
  }
  else if (caract !== 0 && roll.results[0] === caract * 6) {
    let rollSuccess = new Roll("1d6", {});
    rollSuccess = rollSuccess.roll();

    roll.terms.push("+");
    roll.terms.push(rollSuccess.terms[0]);
    roll.results.push("+");
    roll.results.push(rollSuccess.results[0]);
    roll._formula = roll.formula;
    roll._total = roll.total + rollSuccess.total;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: rollLabel + " : Succès critique"
    });
  }
  else {
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: rollLabel
    });
  }
}