import { rollSkill } from "./../arlenor.js";

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
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    // Prepare items.
    if (this.actor.data.type == 'character') {
      this._prepareCharacterHealth(data, true);
      this._prepareCharacterInit(data);
      this._prepareCharacterSkills(data);
      this._prepareCharacterItems(data);
    }
    if (this.actor.data.type == 'creature') {
      this._prepareCharacterHealth(data, false);
      this._prepareCharacterInit(data);
      this._prepareCharacterSkills(data);
      this._prepareCharacterItems(data);
    }

    // console.warn('data', data);

    return data;
  }

  /**
   * Update health stats.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterHealth(sheetData, withRaces = false) {
    const actorData = sheetData.actor;

    const caracts = actorData.data.caracts;
    const safe = actorData.data.healthLevels.safe;
    const injured = actorData.data.healthLevels.injured;
    const seriously = actorData.data.healthLevels.seriously;
    const underdeath = actorData.data.healthLevels.underdeath;

    // Assign and return
    safe.max = 2;
    injured.max = 2;
    seriously.max = 2;
    underdeath.max = 2;

    if (withRaces) {
      const race = actorData.data.attributes.race;
      const races = actorData.data.races;

      if (race === races[1].code
        || race === races[4].code) {
        seriously.max = 1;
      }
      if (race === races[2].code
        || race === races[5].code) {
        seriously.max = 3;
      }
    }

    if (caracts.vig.value === 1) {
      safe.max = 1;
    } else if (caracts.vig.value === 5) {
      safe.max = 3;
    }

    actorData.data.health.max = safe.max + injured.max + seriously.max + underdeath.max;

    if (actorData.data.health.value < underdeath.max) {
      actorData.data.health.indic = underdeath.name;
      safe.value = 0;
      injured.value = 0;
      seriously.value = 0;
      underdeath.value = actorData.data.health.value;
    } else if (actorData.data.health.value < underdeath.max + seriously.max) {
      actorData.data.health.indic = seriously.name;
      safe.value = 0;
      injured.value = 0;
      seriously.value = actorData.data.health.value - underdeath.max;
      underdeath.value = underdeath.max;
    } else if (actorData.data.health.value < underdeath.max + seriously.max + injured.max) {
      actorData.data.health.indic = injured.name;
      safe.value = 0;
      injured.value = actorData.data.health.value - underdeath.max - seriously.max;
      seriously.value = seriously.max;
      underdeath.value = underdeath.max;
    } else {
      actorData.data.health.indic = safe.name;
      safe.value = actorData.data.health.value - underdeath.max - seriously.max - injured.max;
      injured.value = injured.max;
      seriously.value = seriously.max;
      underdeath.value = underdeath.max;
    }
  }

  /**
   * Update init stats.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterInit(sheetData) {
    const actorData = sheetData.actor;

    const hab = actorData.data.caracts.hab;
    const int = actorData.data.caracts.int;

    // Assign and return
    actorData.data.init = hab.value + int.value;
  }

  /**
   * Update skills images.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterSkills(sheetData) {
    const actorData = sheetData.actor;

    // Assign and return
    const skills = actorData.data.skills;
    Object.keys(skills).forEach(key => {
      const skill = skills[key];
      skill.img = {};
      skill.caracts.forEach(caract => {
        skill.img[caract] = "systems/arlenor/assets/icons/skill_" + key + "_" + caract + ".png";
      });
    });
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    // Initialize containers.
    const gear = [];
    const features = {
      "Arme au Corps à corps": [],
      "Arme à Distance": [],
      "Armure": [],
      "Bouclier": []
    };
    const cristals = [];

    let bonusAttack = 0;
    let bonusDefence = 0;

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        if (i.data.featureType != undefined) {
          features[i.data.featureType].push(i);
          if (i.data.equipped) {
            bonusAttack += i.data.attack;
            bonusDefence += i.data.defence;
          }
        }
      }
      // Append to cristals.
      else if (i.type === 'cristal') {
        cristals.push(i);
      }
    }

    cristals.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    // Assign and return
    actorData.gear = gear;
    actorData.features = features;
    actorData.cristals = cristals;
    actorData.bonusAttack = bonusAttack;
    actorData.bonusDefence = bonusDefence;
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
    html.find('.inline-edit-value').click(this._onItemModifyValue.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable caracts and skills.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.owner) {
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
    return this.actor.createOwnedItem(itemData);
  }

  _onItemModifyCheck(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.getOwnedItem(itemId);
    let field = element.dataset.field;
    return item.update({ [field]: element.checked });
  }

  _onItemModifyValue(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.getOwnedItem(itemId);
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
    rollSkill(this.actor, dataset.caractkey, dataset.skillkey, dataset.cristalid, dataset.bonusmalus);
  }
}
