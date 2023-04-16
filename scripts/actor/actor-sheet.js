import { rollSkill } from "./../arlenor.js";
import classes from "./../../models/classes.json" assert { type: "json" };
import divinities from "./../../models/divinities.json" assert { type: "json" };
import races from "./../../models/races.json" assert { type: "json" };

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ArlenorActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["arlenor", "sheet", "actor"],
      template: "systems/arlenor/templates/actor/actor-sheet.hbs",
      width: 620,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const baseData = super.getData();
    baseData.dtypes = ["String", "Number", "Boolean"];

    // Prepare items
    if (baseData.actor.type == 'character') {
      this._prepareCharacterHealth(baseData.actor, true);
      this._prepareCharacterInit(baseData.actor);
      this._prepareCharacterItems(baseData.actor);
    }
    if (baseData.actor.type == 'creature') {
      this._prepareCharacterHealth(baseData.actor, false);
      this._prepareCharacterInit(baseData.actor);
      this._prepareCharacterItems(baseData.actor);
    }

    // Return data for the "actor-sheet.hbs"
    let sheetData = {
      editable: this.isEditable,
      actor: this.actor,
      system: this.actor.system,
      classes: classes,
      divinities: divinities,
      races: races
    };

    return sheetData;
  }

  /**
   * Update health stats.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterHealth(actor, withRaces = false) {
    const data = actor.system;

    const caracts = data.caracts;
    const safe = data.healthLevels.safe;
    const injured = data.healthLevels.injured;
    const underdeath = data.healthLevels.underdeath;

    // Assign and return
    safe.max = 2;
    injured.max = 2;
    underdeath.max = 2;

    if (withRaces) {
      const race = data.attributes.race;
      if (race === races[1].code
        || race === races[4].code) {
        safe.max = 1;
      }
      if (race === races[2].code
        || race === races[5].code) {
        safe.max = 3;
      }
    }

    if (caracts.ten.value === 1) {
      safe.max = 1;
    } else if (caracts.ten.value === 5) {
      safe.max = 3;
    }

    data.health.max = safe.max + injured.max + underdeath.max;

    if (data.health.value < underdeath.max) {
      data.health.indic = underdeath.name;
      safe.value = 0;
      injured.value = 0;
      underdeath.value = data.health.value;
    } else if (data.health.value < underdeath.max + injured.max) {
      data.health.indic = injured.name;
      safe.value = 0;
      injured.value = data.health.value - underdeath.max;
      underdeath.value = underdeath.max;
    } else {
      data.health.indic = safe.name;
      safe.value = data.health.value - underdeath.max - injured.max;
      injured.value = injured.max;
      underdeath.value = underdeath.max;
    }
  }

  /**
   * Update init stats.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterInit(actor) {
    const data = actor.system;

    const hab = data.caracts.hab;
    const int = data.caracts.int;

    // Assign and return
    data.init = hab.value + int.value;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(actor) {
    // Initialize containers
    const equipments = {
      "Arme au Corps à corps": [],
      "Arme à Distance": [],
      "Armure": [],
      "Bouclier": []
    };
    const backpack = [];
    const skills = [];
    const crystals = [];

    // Iterate through items, allocating to containers
    for (let i of actor.items) {
      i.img = i.img || DEFAULT_TOKEN;
      if (i.type === 'equipment') {
        if (i.data.equipmentType != undefined) {
          equipments[i.data.equipmentType].push(i);
          if (i.data.equipped) {
            bonusAttack += i.data.attack;
            bonusDefence += i.data.defence;
          }
        }
      }
      else if (i.type === 'item') {
        backpack.push(i);
      }
      else if (i.type === 'skill') {
        skills.push(i);
      }
      else if (i.type === 'crystal') {
        crystals.push(i);
      }
    }

    backpack.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    skills.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    crystals.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    // Assign and return
    actor.equipments = equipments;
    actor.backpack = backpack;
    actor.skills = skills;
    actor.crystals = crystals;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Modify inline Inventory Item
    html.find('.inline-edit-check').click(this._onItemModifyCheck.bind(this));
    html.find('.inline-edit-value').change(this._onItemModifyValue.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
      li.slideUp(200, () => this.render(false));
    });

    // Rollable caracts and skills.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        if (li.classList.contains("with-drag")) {
          li.setAttribute("draggable", true);
          li.addEventListener("dragstart", handler, false);
        }
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  _onItemModifyCheck(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);
    let field = element.dataset.field;
    return item.update({ [field]: element.checked });
  }

  _onItemModifyValue(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);
    let field = element.dataset.field;
    return item.update({ [field]: element.value });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    rollSkill(this.actor, dataset.caractkey, dataset.skillkey, dataset.crystalid, dataset.bonusmalus);
  }
}
